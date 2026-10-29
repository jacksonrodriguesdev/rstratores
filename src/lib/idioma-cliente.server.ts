// Idioma de cada cliente para os e-mails (espanhol = Uruguai, português = Sul do Brasil).
// Ordem: 1) as páginas que ele mais usa no site (/pt/... = português); 2) país do cadastro;
// 3) celular com +55. Sem nenhum sinal, espanhol.
import { prisma } from "./prisma";

export type Idioma = "es" | "pt";

export async function idiomasDosClientes(ids: number[]): Promise<Map<number, Idioma>> {
  const out = new Map<number, Idioma>();
  if (!ids.length) return out;
  const [users, visitas] = await Promise.all([
    prisma.users.findMany({
      where: { id: { in: ids } },
      select: { id: true, pais: true, telefone: true },
    }),
    prisma.site_visits.groupBy({
      by: ["user_id"],
      where: { user_id: { in: ids }, path: { startsWith: "/pt" } },
      _count: true,
    }),
  ]);
  const totais = await prisma.site_visits.groupBy({
    by: ["user_id"],
    where: { user_id: { in: ids } },
    _count: true,
  });
  const pt = new Map(visitas.map((v) => [v.user_id, v._count]));
  const total = new Map(totais.map((v) => [v.user_id, v._count]));
  for (const u of users) {
    const n = total.get(u.id) ?? 0;
    const p = pt.get(u.id) ?? 0;
    let idioma: Idioma = "es";
    if (n >= 3) idioma = p / n > 0.5 ? "pt" : "es";
    else if (/bra/i.test(u.pais ?? "")) idioma = "pt";
    else if (/^(\+|00)?55/.test((u.telefone ?? "").replace(/[\s()-]/g, ""))) idioma = "pt";
    else if (n > 0 && p / n > 0.5) idioma = "pt";
    out.set(u.id, idioma);
  }
  return out;
}

export async function idiomaDoCliente(id: number): Promise<Idioma> {
  return (await idiomasDosClientes([id])).get(id) ?? "es";
}
