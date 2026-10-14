import { createServerFn } from "@tanstack/react-start";
import type { PrecoFinal } from "./precos";

// Admin → Clientes → "Enviar oferta": escolhe uma peça, define o desconto (aplicado no site)
// e avisa os clientes por e-mail (Resend, como campanha) e por WhatsApp (um a um, pelo painel).

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export type ProdutoOferta = {
  sku: string;
  nome: string;
  codigo: string;
  marca: string | null;
  imagem: string | null;
  fotoPropria: boolean; // foto enviada pelo admin (pode ir no e-mail)
  preco: PrecoFinal | null; // preço atual no site (com promoção, se houver)
  cheioBrl: number | null; // venda em R$ sem promoção
  cheioUyu: number | null;
};

export type ModoDesconto = "atual" | "percent" | "brl" | "uyu";

// Fotos enviadas pelo admin têm nome "<timestamp>-<aleatório>.ext"; as importadas não
const FOTO_PROPRIA = /\/\d{13}-[a-z0-9]{1,8}\.(webp|jpe?g|png)$/i;

async function carregar(sku: string): Promise<ProdutoOferta | null> {
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda } = await import("./precos");
  const { nomeProduto } = await import("./pecas-es");
  // O MySQL ignora espaço no fim ao comparar: acha também SKUs gravados com espaço
  const p = await prisma.agricolas.findFirst({ where: { sku: sku.trim() } });
  if (!p) return null;
  const c = await configPrecos();
  const cheio = precoVenda({ ...p, valor_promocional: null }, c);
  const img =
    p.imagem_principal && !/redeparts/i.test(p.imagem_principal) ? p.imagem_principal : null;
  return {
    sku: p.sku.trim(),
    nome: nomeProduto(p as any),
    codigo: (p.codigo_fabricante || p.sku).trim(),
    marca: p.marca,
    imagem: img,
    fotoPropria: !!img && FOTO_PROPRIA.test(img),
    preco: precoVenda(p, c),
    cheioBrl: cheio?.brl ?? null,
    cheioUyu: cheio?.uyu ?? null,
  };
}

export const buscarProdutoOfertaFn = createServerFn({ method: "GET" })
  .validator((d: { q: string }) => ({
    q: String(d?.q ?? "")
      .trim()
      .slice(0, 80),
  }))
  .handler(async ({ data }): Promise<ProdutoOferta[]> => {
    await admin();
    if (data.q.length < 2) return [];
    const { prisma } = await import("./prisma");
    const q = data.q;
    const rows = await prisma.agricolas.findMany({
      where: {
        duplicado_de: null,
        OR: [
          { sku: { startsWith: q } },
          { codigo_fabricante: { contains: q } },
          { nome: { contains: q } },
          { nome_es: { contains: q } },
        ],
      },
      select: { sku: true },
      orderBy: [{ preco_brl: "desc" }],
      take: 10,
    });
    return (await Promise.all(rows.map((r) => carregar(r.sku)))).filter(Boolean) as ProdutoOferta[];
  });

// Valor promocional em R$ a partir do modo escolhido (null = sem promoção). Usado também no painel.
export function promoBrl(
  p: Pick<ProdutoOferta, "cheioBrl" | "cheioUyu">,
  modo: ModoDesconto,
  valor: number,
): number | null {
  if (!p.cheioBrl) return null;
  if (modo === "percent")
    return valor > 0 && valor < 90 ? Math.round(p.cheioBrl * (1 - valor / 100) * 100) / 100 : null;
  if (modo === "brl") return valor > 0 && valor < p.cheioBrl ? Math.round(valor * 100) / 100 : null;
  // $U: mesma proporção sobre o preço cheio em $U
  if (modo === "uyu")
    return p.cheioUyu && valor > 0 && valor < p.cheioUyu
      ? Math.round(p.cheioBrl * (valor / p.cheioUyu) * 100) / 100
      : null;
  return null;
}

export type EnviarOferta = {
  sku: string;
  modo: ModoDesconto;
  valor: number;
  aplicarNoSite: boolean;
  ids: number[];
  email: boolean;
  assunto: string;
  titulo: string;
  texto: string;
  foto: boolean;
};

// 1) aplica a promoção no produto (opcional) 2) cria a campanha e envia os e-mails em segundo plano.
// Devolve o preço final para o painel montar a mensagem do WhatsApp.
export const enviarOfertaFn = createServerFn({ method: "POST" })
  .validator((d: EnviarOferta) => ({
    ...d,
    sku: String(d.sku ?? "").trim(),
    valor: Number(d.valor) || 0,
    ids: (d.ids ?? []).map(Number).filter(Boolean),
    assunto: String(d.assunto ?? "").slice(0, 200),
    titulo: String(d.titulo ?? "").slice(0, 300),
    texto: String(d.texto ?? "").slice(0, 4000),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    let p = await carregar(data.sku);
    if (!p) throw new Error("Produto não encontrado");

    if (data.aplicarNoSite && data.modo !== "atual") {
      const promo = promoBrl(p, data.modo, data.valor);
      if (!promo)
        throw new Error(
          p.cheioBrl
            ? "Desconto inválido: o preço da oferta precisa ser menor que o preço normal."
            : "Este produto ainda não tem preço. Precifique antes de dar desconto.",
        );
      await prisma.agricolas.updateMany({
        where: { sku: p.sku },
        data: { valor_promocional: promo },
      });
      const { limparCacheCatalogo } = await import("./busca-catalogo.server");
      const { limparCacheFacets } = await import("./products.server");
      limparCacheCatalogo();
      limparCacheFacets();
      p = (await carregar(data.sku))!;
    }

    let campanhaId: number | null = null;
    let destinatarios = 0;
    if (data.email && data.ids.length) {
      const {
        resendConfigurado,
        processarCampanha,
        destinatarios: lista,
      } = await import("./email.server");
      if (!resendConfigurado())
        throw new Error(
          "Configure RESEND_API_KEY e EMAIL_REMETENTE na Hostinger antes de enviar e-mails.",
        );
      const { CONTEUDO_PADRAO } = await import("./email-template");
      const { fmtUYU } = await import("./precos");
      const publico = { tipo: "ids" as const, departamentos: [], dias: 30, ids: data.ids };
      destinatarios = (await lista(publico)).length;
      const pr = p.preco;
      const conteudo = {
        ...CONTEUDO_PADRAO,
        destaque: pr?.desconto ? `-${pr.desconto}% OFF` : "OFERTA",
        titulo: data.titulo,
        texto: data.texto,
        produtosTitulo: "",
        produtos: [
          {
            sku: p.sku,
            nome: p.nome,
            codigo: p.codigo,
            imagem: p.imagem,
            preco: pr?.uyu ? fmtUYU(pr.uyu) : null,
            precoDe: pr?.deUyu ? fmtUYU(pr.deUyu) : null,
            selo: pr?.desconto ? `-${pr.desconto}%` : null,
          },
        ],
        botaoTexto: "Ver la oferta",
        botaoUrl: `/produto/${encodeURIComponent(p.sku)}`,
        fotos: data.foto && !!p.imagem,
      };
      const c = await prisma.email_campanhas.create({
        data: {
          nome: `Oferta ${p.codigo} · ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Montevideo" })}`.slice(
            0,
            150,
          ),
          assunto: data.assunto,
          preheader: pr?.uyu
            ? `${p.nome} por ${fmtUYU(pr.uyu)}. Envíos a todo Uruguay.`.slice(0, 200)
            : "Envíos a todo Uruguay por DAC.",
          conteudo: JSON.stringify(conteudo),
          publico: JSON.stringify(publico),
        },
      });
      campanhaId = c.id;
      const { getRequest } = await import("@tanstack/start-server-core");
      const { origemPublica } = await import("./google-oauth.server");
      // Não espera terminar: o andamento aparece em E-mail marketing
      void processarCampanha(c.id, origemPublica(getRequest()));
    }
    return { produto: p, campanhaId, destinatarios };
  });
