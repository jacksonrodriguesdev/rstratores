// Teste do login com Face ID / digital (passkeys) de ponta a ponta, com um autenticador simulado
// (chave P-256 gerada aqui, assinando como o aparelho faria):
// ativar → entrar → o mesmo desafio não vale duas vezes → assinatura adulterada recusada →
// outro domínio recusado → desafio de outro usuário recusado → aparelho removido não entra mais.
// Roda com: npx tsx scripts/ci/testar-passkey.ts (só em banco de teste)
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";

// ---------- CBOR mínimo (só o que o WebAuthn usa) ----------
function cab(maior: number, n: number) {
  if (n < 24) return Buffer.from([(maior << 5) | n]);
  if (n < 256) return Buffer.from([(maior << 5) | 24, n]);
  const b = Buffer.alloc(3);
  b[0] = (maior << 5) | 25;
  b.writeUInt16BE(n, 1);
  return b;
}
function cbor(v: unknown): Buffer {
  if (typeof v === "number") return v >= 0 ? cab(0, v) : cab(1, -1 - v);
  if (typeof v === "string") return Buffer.concat([cab(3, Buffer.byteLength(v)), Buffer.from(v)]);
  if (v instanceof Uint8Array) return Buffer.concat([cab(2, v.length), Buffer.from(v)]);
  if (v instanceof Map)
    return Buffer.concat([cab(5, v.size), ...[...v].flatMap(([k, x]) => [cbor(k), cbor(x)])]);
  if (v && typeof v === "object") return cbor(new Map(Object.entries(v)));
  throw new Error("cbor");
}
const b64 = (b: Buffer | Uint8Array) => Buffer.from(b).toString("base64url");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest();

// ---------- Autenticador simulado ----------
function aparelho(rpID: string, origem: string) {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = publicKey.export({ format: "jwk" }) as { x: string; y: string };
  const credId = randomBytes(16);
  let contador = 0;
  const flags = (at: boolean) => 0x01 | 0x04 | (at ? 0x40 : 0); // presença + verificação (+ chave)
  const conta = (n: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n);
    return b;
  };
  return {
    credId,
    registrar(challenge: string) {
      const cose = cbor(
        new Map<number, unknown>([
          [1, 2],
          [3, -7],
          [-1, 1],
          [-2, Buffer.from(jwk.x, "base64url")],
          [-3, Buffer.from(jwk.y, "base64url")],
        ]),
      );
      const len = Buffer.alloc(2);
      len.writeUInt16BE(credId.length);
      const authData = Buffer.concat([
        sha(rpID),
        Buffer.from([flags(true)]),
        conta(0),
        Buffer.alloc(16),
        len,
        credId,
        cose,
      ]);
      const cd = Buffer.from(
        JSON.stringify({ type: "webauthn.create", challenge, origin: origem }),
      );
      return {
        id: b64(credId),
        rawId: b64(credId),
        type: "public-key",
        response: {
          clientDataJSON: b64(cd),
          attestationObject: b64(cbor({ fmt: "none", attStmt: new Map(), authData })),
          transports: ["internal"],
        },
        clientExtensionResults: {},
      } as any;
    },
    entrar(challenge: string, adulterar = false) {
      contador++;
      const authData = Buffer.concat([sha(rpID), Buffer.from([flags(false)]), conta(contador)]);
      const cd = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge, origin: origem }));
      const assinatura = sign("sha256", Buffer.concat([authData, sha(cd)]), privateKey);
      if (adulterar) assinatura[assinatura.length - 1] ^= 0xff;
      return {
        id: b64(credId),
        rawId: b64(credId),
        type: "public-key",
        response: {
          clientDataJSON: b64(cd),
          authenticatorData: b64(authData),
          signature: b64(assinatura),
        },
        clientExtensionResults: {},
      } as any;
    },
  };
}

(async () => {
  const banco =
    String(process.env.DATABASE_URL ?? "")
      .split("/")
      .pop() ?? "";
  assert.ok(/ci|teste/i.test(banco), "use um banco de teste");
  const { prisma } = await import("../../src/lib/prisma");
  const p = await import("../../src/lib/passkey.server");
  const s = Date.now();
  const [ana, beto] = await Promise.all(
    ["ana", "beto"].map((n) =>
      prisma.users.create({
        data: {
          nome_completo: `${n} Teste`,
          email: `pk-${n}-${s}@example.com`,
          senha_hash: "x",
          role: "USER",
        } as any,
      }),
    ),
  );
  const req = (host = "localhost:3999") =>
    new Request(`http://${host}/api/auth/passkey/opcoes`, {
      headers: { host, "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" },
    });
  try {
    assert.equal(p.rpDe(req("site-falso.com")), null, "outro domínio");
    assert.equal(p.rpDe(req())?.origem, "http://localhost:3999");
    const tel = aparelho("localhost", "http://localhost:3999");

    // Ativar
    const o = await p.opcoesRegistro(req(), { id: ana.id, email: ana.email, nome: "Ana" });
    assert.ok(!("erro" in o));
    if ("erro" in o) return;
    assert.equal(o.opcoes.authenticatorSelection?.userVerification, "required");
    const outro = await p.verificarRegistro(
      req(),
      beto.id,
      o.token,
      tel.registrar(o.opcoes.challenge),
    );
    assert.ok("erro" in outro && outro.erro === "expirou", "desafio da Ana não vale para o Beto");
    const o2 = await p.opcoesRegistro(req(), { id: ana.id, email: ana.email, nome: "Ana" });
    if ("erro" in o2) throw new Error("o2");
    const reg = await p.verificarRegistro(
      req(),
      ana.id,
      o2.token,
      tel.registrar(o2.opcoes.challenge),
    );
    assert.ok("ok" in reg, "aparelho ativado");
    const lista = await p.listarPasskeys(ana.id);
    assert.equal(lista.length, 1);
    assert.equal(lista[0].aparelho, "iPhone");

    // Entrar
    const l = await p.opcoesLogin(req());
    if ("erro" in l) throw new Error("l");
    const resp = tel.entrar(l.opcoes.challenge);
    const ok = await p.verificarLogin(req(), l.token, resp);
    assert.ok("ok" in ok && ok.user.id === ana.id, "entrou como a Ana");
    const repetido = await p.verificarLogin(req(), l.token, resp);
    assert.ok(
      "erro" in repetido && repetido.erro === "expirou",
      "o mesmo desafio não vale de novo",
    );
    assert.ok((await p.listarPasskeys(ana.id))[0].usado, "último uso gravado");

    // Assinatura adulterada
    const l2 = await p.opcoesLogin(req());
    if ("erro" in l2) throw new Error("l2");
    const falso = await p.verificarLogin(req(), l2.token, tel.entrar(l2.opcoes.challenge, true));
    assert.ok("erro" in falso && falso.erro === "invalida", "assinatura adulterada");

    // Aparelho que nunca foi ativado
    const estranho = aparelho("localhost", "http://localhost:3999");
    const l3 = await p.opcoesLogin(req());
    if ("erro" in l3) throw new Error("l3");
    const r3 = await p.verificarLogin(req(), l3.token, estranho.entrar(l3.opcoes.challenge));
    assert.ok("erro" in r3 && r3.erro === "desconhecida");

    // Outro domínio não consegue nem pedir o desafio
    const dom = await p.opcoesLogin(req("site-falso.com"));
    assert.ok("erro" in dom && dom.erro === "dominio");

    // Removido em Mi cuenta: não entra mais (o Beto não consegue remover o da Ana)
    await p.removerPasskey(beto.id, lista[0].id);
    assert.equal((await p.listarPasskeys(ana.id)).length, 1, "só o dono remove");
    await p.removerPasskey(ana.id, lista[0].id);
    const l4 = await p.opcoesLogin(req());
    if ("erro" in l4) throw new Error("l4");
    const r4 = await p.verificarLogin(req(), l4.token, tel.entrar(l4.opcoes.challenge));
    assert.ok("erro" in r4 && r4.erro === "desconhecida", "removido não entra");
    console.log("Login com Face ID (passkeys): ok");
  } finally {
    await prisma.$executeRawUnsafe("DELETE FROM passkeys WHERE user_id IN (?, ?)", ana.id, beto.id);
    await prisma.users.deleteMany({ where: { id: { in: [ana.id, beto.id] } } });
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
