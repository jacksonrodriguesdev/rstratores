import { createServerFn } from "@tanstack/react-start";

// Painel Admin → Clientes: todos os cadastros da loja, onde estão (departamento e cidade)
// e o que fizeram (carrinhos, catálogos). Quando o cliente não informou o departamento,
// usamos a localização aproximada pelo IP da última visita dele (via carrinho salvo).

// Capitais dos 19 departamentos do Uruguai (lon, lat) para desenhar o mapa
export const COORD_DEPTO: Record<string, [number, number]> = {
  Artigas: [-56.47, -30.4],
  Canelones: [-56.28, -34.52],
  "Cerro Largo": [-54.17, -32.37],
  Colonia: [-57.84, -34.47],
  Durazno: [-56.52, -33.38],
  Flores: [-56.9, -33.52],
  Florida: [-56.21, -34.1],
  Lavalleja: [-55.24, -34.37],
  Maldonado: [-54.95, -34.9],
  Montevideo: [-56.19, -34.9],
  Paysandú: [-58.08, -32.32],
  "Río Negro": [-58.3, -33.13],
  Rivera: [-55.55, -30.9],
  Rocha: [-54.33, -34.48],
  Salto: [-57.96, -31.39],
  "San José": [-56.71, -34.34],
  Soriano: [-58.03, -33.25],
  Tacuarembó: [-55.98, -31.71],
  "Treinta y Tres": [-54.38, -33.23],
};

// Cidades da fronteira e do leste (lon, lat): o cliente costuma digitar a cidade e não o departamento
const COORD_CIDADE: Record<string, { c: [number, number]; depto?: string; pais: string }> = {
  chuy: { c: [-53.46, -33.7], depto: "Rocha", pais: "UY" },
  "la paloma": { c: [-54.16, -34.66], depto: "Rocha", pais: "UY" },
  castillos: { c: [-53.84, -34.2], depto: "Rocha", pais: "UY" },
  lascano: { c: [-54.2, -33.67], depto: "Rocha", pais: "UY" },
  "rio branco": { c: [-53.38, -32.6], depto: "Cerro Largo", pais: "UY" },
  "punta del este": { c: [-54.93, -34.96], depto: "Maldonado", pais: "UY" },
  "san carlos": { c: [-54.92, -34.79], depto: "Maldonado", pais: "UY" },
  "las piedras": { c: [-56.22, -34.73], depto: "Canelones", pais: "UY" },
  "ciudad de la costa": { c: [-55.95, -34.82], depto: "Canelones", pais: "UY" },
  young: { c: [-57.63, -32.69], depto: "Río Negro", pais: "UY" },
  dolores: { c: [-58.22, -33.53], depto: "Soriano", pais: "UY" },
  carmelo: { c: [-58.29, -34.0], depto: "Colonia", pais: "UY" },
  chui: { c: [-53.46, -33.69], pais: "BR" },
  "santa vitoria do palmar": { c: [-53.37, -33.52], pais: "BR" },
  "rio grande": { c: [-52.1, -32.03], pais: "BR" },
  pelotas: { c: [-52.34, -31.77], pais: "BR" },
  jaguarao: { c: [-53.38, -32.56], pais: "BR" },
  "santana do livramento": { c: [-55.53, -30.89], pais: "BR" },
  acegua: { c: [-54.16, -31.87], pais: "BR" },
  bage: { c: [-54.1, -31.33], pais: "BR" },
  quarai: { c: [-56.45, -30.39], pais: "BR" },
  uruguaiana: { c: [-57.08, -29.75], pais: "BR" },
  "porto alegre": { c: [-51.23, -30.03], pais: "BR" },
};
const NOME_PAIS: Record<string, string> = {
  UY: "Uruguay",
  BR: "Brasil",
  AR: "Argentina",
  PY: "Paraguay",
};
const titulo = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/ (Do|Da|Dos|Das|De|Del|La|Y) /g, (m) => m.toLowerCase());

export type Cliente = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  avatar: string | null;
  google: boolean;
  departamento: string | null; // informado no cadastro ou deduzido pelo IP
  cidade: string | null;
  pais: string | null; // código (UY, BR...) quando veio do IP, ou o texto do cadastro
  origemLocal: "cadastro" | "ip" | null;
  lat: number | null;
  lon: number | null;
  criado: string;
  ultimoLogin: string | null;
  recebeEmails: boolean;
  carrinhos: number;
  catalogos: number;
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const DEPTO_POR_NOME = new Map(Object.keys(COORD_DEPTO).map((d) => [semAcento(d), d]));
const deptoDe = (s: string | null | undefined) =>
  s
    ? (DEPTO_POR_NOME.get(
        semAcento(s.replace(/^departamento de /i, "").replace(/ department$/i, "")),
      ) ?? null)
    : null;

export const listarClientesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Cliente[]> => {
    const { assertAdmin } = await import("./auth.server");
    await assertAdmin();
    const { prisma } = await import("./prisma");

    const users = await prisma.users.findMany({
      where: { role: { not: "ADMIN" } },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        nome_completo: true,
        email: true,
        telefone: true,
        avatar_url: true,
        google_id: true,
        departamento: true,
        cidade: true,
        pais: true,
        created_at: true,
        ultimo_login: true,
        recebe_emails: true,
        _count: { select: { carrinhos: true, downloads: true } },
      },
    });

    // Visitante (cookie) de cada cliente, pelos carrinhos salvos com login
    const carts = await prisma.carrinhos.findMany({
      where: { user_id: { in: users.map((u) => u.id) } },
      select: { user_id: true, visitante_id: true },
      orderBy: { updated_at: "desc" },
    });
    const vidDe = new Map<number, string[]>();
    for (const c of carts)
      if (c.user_id) vidDe.set(c.user_id, [...(vidDe.get(c.user_id) ?? []), c.visitante_id]);
    const vids = [...new Set(carts.map((c) => c.visitante_id))];
    const visitas = vids.length
      ? await prisma.site_visits.findMany({
          where: { visitor_id: { in: vids }, city: { not: null } },
          orderBy: { id: "desc" },
          select: {
            visitor_id: true,
            city: true,
            region: true,
            country_code: true,
            latitude: true,
            longitude: true,
          },
          take: 5000,
        })
      : [];
    const ultimaVisita = new Map<string, (typeof visitas)[number]>();
    for (const v of visitas)
      if (v.visitor_id && !ultimaVisita.has(v.visitor_id)) ultimaVisita.set(v.visitor_id, v);

    return users.map((u) => {
      const ip = (vidDe.get(u.id) ?? []).map((v) => ultimaVisita.get(v)).find(Boolean);
      const deptoCadastro = deptoDe(u.departamento);
      const deptoIp = ip?.country_code === "UY" ? deptoDe(ip.region) : null;
      const cidadeTxt = u.cidade?.trim() || null;
      const conhecida = cidadeTxt ? COORD_CIDADE[semAcento(cidadeTxt)] : undefined;
      const paisCad = semAcento(u.pais ?? "");
      const codPais =
        deptoCadastro || conhecida?.pais === "UY"
          ? "UY"
          : (conhecida?.pais ??
            ip?.country_code ??
            (paisCad.startsWith("bra")
              ? "BR"
              : paisCad.startsWith("urug")
                ? "UY"
                : paisCad.startsWith("arg")
                  ? "AR"
                  : null));
      // Fora do Uruguai o "departamento" do painel é o país (ex.: Brasil)
      const departamento =
        deptoCadastro ??
        conhecida?.depto ??
        deptoIp ??
        (codPais && codPais !== "UY" ? (NOME_PAIS[codPais] ?? codPais) : ip?.region || null);
      const origemLocal =
        deptoCadastro || cidadeTxt || (u.pais && codPais) ? "cadastro" : ip ? "ip" : null;
      // No mapa: cidade do IP quando bate com o departamento; senão, a capital do departamento
      const ipConfere =
        !conhecida &&
        ip &&
        ip.latitude != null &&
        ip.longitude != null &&
        (!deptoCadastro || deptoCadastro === deptoIp);
      const capital =
        conhecida && (!deptoCadastro || conhecida.depto === deptoCadastro)
          ? conhecida.c
          : deptoCadastro
            ? COORD_DEPTO[deptoCadastro]
            : deptoIp
              ? COORD_DEPTO[deptoIp]
              : null;
      return {
        id: u.id,
        nome: u.nome_completo,
        email: u.email,
        telefone: u.telefone,
        avatar: u.avatar_url,
        google: !!u.google_id,
        departamento,
        cidade: cidadeTxt ? titulo(cidadeTxt) : ip?.city || null,
        pais: codPais ?? u.pais,
        origemLocal,
        lat: ipConfere ? ip!.latitude : capital ? capital[1] : null,
        lon: ipConfere ? ip!.longitude : capital ? capital[0] : null,
        criado: u.created_at.toISOString(),
        ultimoLogin: u.ultimo_login?.toISOString() ?? null,
        recebeEmails: u.recebe_emails,
        carrinhos: u._count.carrinhos,
        catalogos: u._count.downloads,
      };
    });
  },
);

// Ficha completa de um cliente (Admin → Clientes → olho)
export const fichaClienteFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./auth.server");
    await assertAdmin();
    const f = await import("./ficha-cliente.server");
    return f.fichaCliente(data.id);
  });
