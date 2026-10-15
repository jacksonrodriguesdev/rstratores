// Pop-up "Entrá y ganá": login rápido por código de 6 dígitos no e-mail, cadastro rápido e
// cupom único de boas-vindas. As rotas ficam em src/routes/api/auth.codigo*.ts e auth.rapido.ts.
import { createHash, randomInt, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";

const MINUTO = 60_000;

// ---------- Configuração do pop-up (tabela configuracoes, chaves popup_*) ----------
export const POPUP_PADRAO = {
  popup_ativo: "1",
  popup_segundos: "5",
  popup_desconto: "15",
  popup_titulo: "Ingresá para ver precios y cotizar",
  popup_subtitulo: "Registrate gratis con tu e-mail en segundos.",
};
// Valores padrão antigos: quem nunca personalizou no admin passa a ver os novos
const PADRAO_ANTIGO: Record<string, string[]> = {
  popup_segundos: ["8"],
  popup_titulo: [
    "¡Entrá y llevate {{descuento}}% OFF en tu primera compra!",
    "Registrate gratis y accedé a todas nuestras herramientas",
  ],
  popup_subtitulo: [
    "Creá tu cuenta gratis en segundos y accedé a todos los catálogos de tractores.",
    "Catálogos de piezas, precios por WhatsApp, pedido rápido por lista y {{descuento}}% OFF en tu primera compra.",
  ],
};
export type ConfigPopup = {
  ativo: boolean;
  segundos: number;
  desconto: number;
  titulo: string;
  subtitulo: string;
};

export async function configPopup(): Promise<ConfigPopup> {
  const { prisma } = await import("./prisma");
  const rows = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "popup_" } } });
  const v: Record<string, string> = {
    ...POPUP_PADRAO,
    ...Object.fromEntries(
      rows.filter((r) => !PADRAO_ANTIGO[r.chave]?.includes(r.valor)).map((r) => [r.chave, r.valor]),
    ),
  };
  return {
    ativo: v.popup_ativo === "1",
    segundos: Math.min(120, Math.max(1, Number(v.popup_segundos) || 8)),
    desconto: Math.min(90, Math.max(1, Number(v.popup_desconto) || 15)),
    titulo: v.popup_titulo,
    subtitulo: v.popup_subtitulo,
  };
}

export async function salvarConfigPopup(c: ConfigPopup) {
  const { prisma } = await import("./prisma");
  const valores: Record<string, string> = {
    popup_ativo: c.ativo ? "1" : "0",
    popup_segundos: String(Math.min(120, Math.max(1, Math.round(c.segundos) || 8))),
    popup_desconto: String(Math.min(90, Math.max(1, Math.round(c.desconto) || 15))),
    popup_titulo: String(c.titulo || POPUP_PADRAO.popup_titulo).slice(0, 200),
    popup_subtitulo: String(c.subtitulo || POPUP_PADRAO.popup_subtitulo).slice(0, 300),
  };
  for (const [chave, valor] of Object.entries(valores)) {
    await prisma.configuracoes.upsert({
      where: { chave },
      create: { chave, valor },
      update: { valor },
    });
  }
}

// ---------- Cupom único (ex.: AGRO-7F3K) ----------
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0/O, 1/I/L

export async function garantirCupom(userId: number): Promise<string | null> {
  const { prisma } = await import("./prisma");
  const u = await prisma.users.findUnique({ where: { id: userId }, select: { cupom: true } });
  if (!u) return null;
  if (u.cupom) return u.cupom;
  for (let i = 0; i < 6; i++) {
    const codigo =
      "AGRO-" + Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
    try {
      await prisma.users.update({ where: { id: userId }, data: { cupom: codigo } });
      return codigo;
    } catch {
      /* código repetido (índice único): tenta outro */
    }
  }
  return null;
}

// ---------- Código de 6 dígitos ----------
const segredo = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET ausente");
  return s;
};
const hashCodigo = (email: string, codigo: string) =>
  createHash("sha256").update(`${email}|${codigo}|${segredo()}`).digest("hex");

// Limite por IP (além do limite por e-mail no banco)
const porIp = new Map<string, number[]>();
function ipLiberado(ip: string | null) {
  if (!ip) return true;
  const agora = Date.now();
  const l = (porIp.get(ip) ?? []).filter((t) => agora - t < 15 * MINUTO);
  if (l.length >= 8) return false;
  l.push(agora);
  porIp.set(ip, l);
  if (porIp.size > 5000) porIp.clear();
  return true;
}

export async function criarCodigo(
  email: string,
  ip: string | null,
): Promise<{ codigo: string } | { erro: string }> {
  const { prisma } = await import("./prisma");
  const recentes = await prisma.login_codigos.count({
    where: { email, created_at: { gte: new Date(Date.now() - 15 * MINUTO) } },
  });
  if (recentes >= 3 || !ipLiberado(ip))
    return { erro: "Pediste varios códigos. Esperá unos minutos y probá de nuevo." };
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Pedir de novo não invalida o anterior: se o primeiro e-mail chegar depois, ele ainda vale
  await prisma.login_codigos.create({
    data: {
      email,
      codigo_hash: hashCodigo(email, codigo),
      expira_em: new Date(Date.now() + 10 * MINUTO),
    },
  });
  return { codigo };
}

export async function conferirCodigo(
  email: string,
  codigo: string,
): Promise<{ ok: true } | { erro: string }> {
  const { prisma } = await import("./prisma");
  // Vale qualquer um dos códigos ainda válidos deste e-mail (no máximo os 3 últimos)
  const validos = await prisma.login_codigos.findMany({
    where: { email, usado: false, expira_em: { gt: new Date() } },
    orderBy: { id: "desc" },
    take: 3,
  });
  if (!validos.length) return { erro: "El código venció. Pedí uno nuevo." };
  if (validos[0].tentativas >= 5) return { erro: "Demasiados intentos. Pedí un código nuevo." };
  const hash = hashCodigo(email, codigo.replace(/\D/g, ""));
  const ids = validos.map((c) => c.id);
  if (!validos.some((c) => c.codigo_hash === hash)) {
    // Erro conta para todos (evita tentar de novo em outro código)
    await prisma.login_codigos.updateMany({
      where: { id: { in: ids } },
      data: { tentativas: { increment: 1 } },
    });
    return { erro: "Código incorrecto. Revisalo y probá de nuevo." };
  }
  await prisma.login_codigos.updateMany({ where: { id: { in: ids } }, data: { usado: true } });
  return { ok: true };
}

// E-mail com o código (transacional: sem link de descadastro)
export async function enviarEmailCodigo(
  email: string,
  codigo: string,
  origem: string,
  idioma: "es" | "pt" = "es",
) {
  const { enviarUm, montarMensagem } = await import("./email.server");
  const pt = idioma === "pt";
  const m = montarMensagem(
    {
      destaque: pt ? "SEU CÓDIGO" : "TU CÓDIGO",
      titulo: pt ? "Entre na AGRO PARTS com este código" : "Entrá a AGRO PARTS con este código",
      texto: pt
        ? "Digite o código na janela do site. Se não foi você que pediu, ignore este e-mail."
        : "Escribí el código en la ventana del sitio. Si no lo pediste vos, ignorá este e-mail.",
      cupom: {
        codigo: `${codigo.slice(0, 3)} ${codigo.slice(3)}`,
        texto: pt ? "Código de acesso" : "Código de acceso",
        validade: "por 10 minutos",
      },
      produtos: [],
      whatsapp: false,
      cor: "#0b7a3b",
    },
    pt ? `${codigo} é seu código da AGRO PARTS` : `${codigo} es tu código de AGRO PARTS`,
    "Válido por 10 minutos.",
    origem,
    { email },
  );
  return enviarUm(m);
}

// Prova de que o e-mail foi confirmado pelo código (para terminar o cadastro rápido)
export async function tokenEmailConfirmado(email: string) {
  return new SignJWT({ email, uso: "cadastro_rapido" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("20m")
    .sign(new TextEncoder().encode(segredo()));
}
export async function lerTokenEmail(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(segredo()));
    return payload.uso === "cadastro_rapido" && typeof payload.email === "string"
      ? payload.email
      : null;
  } catch {
    return null;
  }
}

// Conta criada sem senha (Google ou código): pode criar uma senha depois em Mi cuenta
export const senhaAleatoria = (prefixo: "google" | "codigo") =>
  `${prefixo}:${randomBytes(24).toString("hex")}`;
export const contaSemSenha = (hash: string) =>
  hash.startsWith("google:") || hash.startsWith("codigo:");
