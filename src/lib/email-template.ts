// Modelo dos e-mails (campanhas e lembrete de carrinho). Código puro: roda no navegador
// (prévia ao vivo no editor do admin) e no servidor (envio pelo Resend).
// HTML em tabelas e estilos inline, que é o que Gmail, Outlook e celulares entendem.

export type ProdutoEmail = {
  sku: string;
  nome: string;
  codigo?: string | null;
  imagem?: string | null;
  quantidade?: number;
  // Ofertas: preço já formatado ("$U 7.160"), preço "de" riscado e selo ("-18%")
  preco?: string | null;
  precoDe?: string | null;
  selo?: string | null;
};

export type ConteudoEmail = {
  cabecalho?: string; // imagem do topo (caminho em /uploads ou URL)
  cabecalhoLink?: string;
  destaque?: string; // selo acima do título, ex.: "-15% OFF" ou "SOLO ESTA SEMANA"
  titulo: string;
  texto: string; // parágrafos separados por linha em branco; **negrito** e [texto](link)
  produtosTitulo?: string;
  produtos: ProdutoEmail[];
  botaoTexto?: string;
  botaoUrl?: string;
  whatsapp?: boolean; // mostra o botão "Cotizar por WhatsApp"
  // Fotos dos produtos no e-mail. Desligado por padrão: boa parte das fotos do catálogo veio
  // de outra loja; só ligue para fotos próprias ou autorizadas.
  fotos?: boolean;
  // Cupom em destaque (caixa tracejada com o código)
  cupom?: { codigo: string; texto?: string; validade?: string } | null;
  cor: string;
  blocos?: BlocoEmail[];
  tema?: Partial<TemaEmail>;
  // true: este e-mail não leva o anúncio (Admin → E-mail marketing → Anúncios)
  semAnuncio?: boolean;
};

// Anúncio por e-mail escolhido no envio (email-marketing.server.ts → escolherAnuncio)
export type AnuncioEmail = {
  id: number;
  titulo: string;
  texto?: string | null;
  imagem?: string | null;
  link: string;
  botao?: string | null;
};

// Construtor por blocos (email-blocos.ts): quando há blocos, o e-mail é montado só com eles
// (o topo com a logo e o rodapé com o "darse de baja" continuam sempre).
import { renderBlocos, textoBlocos, type BlocoEmail, type TemaEmail } from "./email-blocos";
import { fotoInvalida } from "./fotos";

// Variáveis das automações: {{cupon}}, {{validez}}, {{descuento}}... (o {{nombre}} é por cliente)
export function trocarVariaveis(s: string, vars: Record<string, string>) {
  return s.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) =>
    k.toLowerCase() in vars ? vars[k.toLowerCase()] : m,
  );
}
export function aplicarVariaveis(c: ConteudoEmail, vars: Record<string, string>): ConteudoEmail {
  const t = (x?: string) => (x == null ? x : trocarVariaveis(x, vars));
  return {
    ...c,
    destaque: t(c.destaque),
    titulo: t(c.titulo)!,
    texto: t(c.texto)!,
    produtosTitulo: t(c.produtosTitulo),
    botaoTexto: t(c.botaoTexto),
    cupom: c.cupom
      ? { codigo: t(c.cupom.codigo)!, texto: t(c.cupom.texto), validade: t(c.cupom.validade) }
      : c.cupom,
    blocos: c.blocos?.map((b) => ({ ...b, d: trocarEmTudo(b.d, (x) => t(x)!) })),
  };
}
// Troca as variáveis em todos os textos de um objeto (blocos guardam listas e campos soltos)
export function trocarEmTudo<T>(v: T, f: (s: string) => string): T {
  if (typeof v === "string") return f(v) as T;
  if (Array.isArray(v)) return v.map((x) => trocarEmTudo(x, f)) as T;
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trocarEmTudo(x, f)])) as T;
  return v;
}

export type Publico = {
  tipo:
    | "todos"
    | "departamentos"
    | "carrinho"
    | "catalogos"
    | "recentes"
    | "inativos"
    | "ids"
    | "remarketing";
  departamentos: string[];
  dias: number;
  ids?: number[]; // tipo "ids": clientes escolhidos na página Clientes
  // tipo "remarketing": clientes de um e-mail anterior conforme o que fizeram com ele
  origem?: { campanha?: number | null; automacao?: number | null };
  etapa?: "nao_abriu" | "abriu_nao_clicou" | "clicou_nao_comprou";
};
export const ETAPAS_REMARKETING: Array<[NonNullable<Publico["etapa"]>, string]> = [
  ["nao_abriu", "Não abriram"],
  ["abriu_nao_clicou", "Abriram e não clicaram"],
  ["clicou_nao_comprou", "Clicaram e não compraram"],
];

export const PUBLICOS: { valor: Publico["tipo"]; rotulo: string; usaDias?: boolean }[] = [
  { valor: "todos", rotulo: "Todos os clientes cadastrados" },
  { valor: "departamentos", rotulo: "Clientes de departamentos específicos" },
  { valor: "carrinho", rotulo: "Montaram carrinho nos últimos N dias", usaDias: true },
  { valor: "catalogos", rotulo: "Abriram catálogos nos últimos N dias", usaDias: true },
  { valor: "recentes", rotulo: "Cadastrados nos últimos N dias", usaDias: true },
  { valor: "inativos", rotulo: "Sem entrar no site há mais de N dias", usaDias: true },
  { valor: "ids", rotulo: "Clientes escolhidos na página Clientes" },
  {
    valor: "remarketing",
    rotulo: "Remarketing: quem não abriu / não clicou / não comprou um e-mail",
  },
];

export const PUBLICO_PADRAO: Publico = { tipo: "todos", departamentos: [], dias: 30 };

export const CONTEUDO_PADRAO: ConteudoEmail = {
  destaque: "OFERTAS DEL MES",
  titulo: "¡Hola {{nombre}}! Repuestos para tu tractor con precio especial",
  texto:
    "Seleccionamos repuestos con **precio especial** para este mes.\n\nPedí tu cotización por WhatsApp y te respondemos con precio y disponibilidad.",
  produtosTitulo: "Destacados del mes",
  produtos: [],
  botaoTexto: "Ver todos los repuestos",
  botaoUrl: "/loja",
  whatsapp: true,
  fotos: false,
  cor: "#0b7a3b",
};

export type DadosRender = {
  origem: string; // https://agropartsuy.com (links e imagens precisam de endereço completo)
  nome?: string | null;
  preheader?: string | null;
  urlBaixa?: string | null; // link "darse de baja" (obrigatório em campanhas)
  campanha?: string; // vai no utm_campaign dos links do site
  whatsappUrl?: string;
  enderecoRodape?: string;
  // Blocos de produtos: peças já com preço do dia, por id do bloco (resolvidas no servidor)
  produtosBloco?: Record<string, ProdutoEmail[]>;
  // Variáveis do cliente além do nome ({{departamento}}, {{mi_cupon}})
  vars?: Record<string, string>;
  // Hora de referência da contagem regressiva (envio ou prévia)
  agora?: number;
  // Anúncio que entra antes do rodapé (some se o conteúdo tiver semAnuncio)
  anuncio?: AnuncioEmail | null;
  // Idioma do cliente: textos fixos do modelo e links do site (/pt para o Brasil)
  idioma?: "es" | "pt";
};

// Texto fixo do modelo no idioma do cliente
const tx = (d: DadosRender, es: string, pt: string) => (d.idioma === "pt" ? pt : es);

// Link do anúncio: UTM da campanha + utm_content=anuncio-<id> (o clique é contado no anúncio)
export function linkAnuncio(a: AnuncioEmail, d: DadosRender) {
  const abs = comUtm(a.link, d);
  try {
    const u = new URL(abs);
    u.searchParams.set("utm_content", `anuncio-${a.id}`);
    return u.toString();
  } catch {
    return abs;
  }
}

// Bloco do anúncio (tabelas e estilos inline, igual ao resto do e-mail)
export function anuncioHtml(
  a: AnuncioEmail,
  d: DadosRender,
  o: { cor: string; fundo?: string; titulo?: string; texto?: string; rotulo?: string },
) {
  const href = esc(linkAnuncio(a, d));
  const img = a.imagem ? urlAbsoluta(a.imagem, d.origem) : "";
  const corBotao = /^#[0-9a-f]{6}$/i.test(o.cor) ? o.cor : "#0b7a3b";
  return `<tr><td style="padding:10px 24px 4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${o.fundo ?? "#f4f7f2"};border-radius:16px;overflow:hidden">
<tr><td style="padding:10px 16px 0;${fonte};font-size:10px;font-weight:800;letter-spacing:2px;color:#a1a1aa;text-transform:uppercase">${esc(o.rotulo ?? "Destacado")}</td></tr>
${img ? `<tr><td style="padding:8px 16px 0"><a href="${href}"><img src="${esc(img)}" alt="${esc(a.titulo)}" width="568" style="display:block;width:100%;height:auto;border:0;border-radius:12px"></a></td></tr>` : ""}
<tr><td style="padding:12px 16px 16px;${fonte}">
<p style="margin:0;font-size:18px;font-weight:800;line-height:1.3;color:${o.titulo ?? "#06321b"}">${esc(a.titulo)}</p>
${a.texto ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:${o.texto ?? "#3f3f46"}">${esc(a.texto)}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px"><tr><td style="border-radius:10px;background:${corBotao}"><a href="${href}" style="display:inline-block;padding:11px 20px;${fonte};font-size:14px;font-weight:800;color:${corBotao.toLowerCase() === "#f5c518" ? "#111111" : "#ffffff"};text-decoration:none;border-radius:10px">${esc(a.botao || "Ver más")} &rarr;</a></td></tr></table>
</td></tr></table></td></tr>`;
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const primeiroNome = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] ?? "";

// {{nombre}} vira o primeiro nome; sem nome, some junto com o espaço/vírgula antes dele
export function personalizar(s: string, nome?: string | null) {
  const p = primeiroNome(nome);
  const nomeFmt = p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
  return nomeFmt
    ? s.replace(/\{\{\s*nombre\s*\}\}/gi, nomeFmt)
    : s.replace(/[ ,]*\{\{\s*nombre\s*\}\}/gi, "");
}

export function urlAbsoluta(u: string | null | undefined, origem: string) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return origem + u;
  return `${origem}/uploads/${u}`;
}

// Links para o próprio site levam UTM, para a campanha aparecer no painel de Visitantes
export function comUtm(u: string, d: DadosRender) {
  const caminho =
    d.idioma === "pt" && /^\/(?!pt(\/|$)|uploads\/|email\/|api\/)/.test(u) ? `/pt${u}` : u;
  const abs = urlAbsoluta(caminho, d.origem);
  if (!abs.startsWith(d.origem) || !d.campanha) return abs;
  const url = new URL(abs);
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", d.campanha);
  return url.toString();
}

export function formatarTexto(
  t: string,
  d: DadosRender,
  cor: string,
  estilo = "font-size:16px;line-height:1.6;color:#3f3f46",
) {
  return t
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => {
      let h = esc(p.trim());
      h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      h = h.replace(
        /\[([^\]]+)\]\(([^)\s]+)\)/g,
        (_m, txt, href) =>
          `<a href="${esc(comUtm(href.replace(/&amp;/g, "&"), d))}" style="color:${cor};font-weight:700">${txt}</a>`,
      );
      h = h.replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px;${estilo}">${h}</p>`;
    })
    .join("");
}

export const fonte = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function botao(texto: string, href: string, fundo: string, corTexto = "#ffffff") {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td style="border-radius:12px;background:${fundo}">
<a href="${esc(href)}" style="display:inline-block;padding:15px 30px;${fonte};font-size:16px;font-weight:800;color:${corTexto};text-decoration:none;border-radius:12px">${esc(texto)}</a>
</td></tr></table>`;
}

function cartaoProduto(
  p: ProdutoEmail,
  d: DadosRender,
  cor: string,
  fotos: boolean,
  largura = "50%",
) {
  const link = comUtm(`/produto/${encodeURIComponent(p.sku)}`, d);
  const img = fotos && p.imagem && !fotoInvalida(p.imagem) ? urlAbsoluta(p.imagem, d.origem) : "";
  return `<td width="${largura}" valign="top" style="padding:6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:14px">
<tr><td align="center" style="padding:14px 14px 0"><a href="${esc(link)}" style="text-decoration:none">${
    img
      ? `<img src="${esc(img)}" alt="${esc(p.nome)}" width="200" style="display:block;width:100%;max-width:200px;height:160px;object-fit:contain;border:0">`
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="height:110px;background:#f0f6ef;border-radius:10px;${fonte}"><p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;color:#71717a">CÓDIGO</p><p style="margin:4px 0 0;font-size:20px;font-weight:800;color:${cor}">${esc(p.codigo || p.sku)}</p></td></tr></table>`
  }</a></td></tr>
<tr><td style="padding:10px 14px 14px;${fonte}">
<p style="margin:0;font-size:14px;font-weight:700;line-height:1.35;color:#18181b">${p.quantidade ? `${p.quantidade}× ` : ""}${esc(p.nome)}</p>
${p.codigo && img ? `<p style="margin:4px 0 0;font-size:12px;color:#71717a">Cód: ${esc(p.codigo)}</p>` : ""}
${
  p.preco
    ? `<p style="margin:10px 0 0">${p.precoDe ? `<span style="font-size:13px;color:#a1a1aa;text-decoration:line-through">${esc(p.precoDe)}</span> ` : ""}${p.selo ? `<span style="display:inline-block;background:#dc2626;color:#ffffff;font-size:11px;font-weight:800;padding:2px 6px;border-radius:6px">${esc(p.selo)}</span>` : ""}</p>
<p style="margin:2px 0 0;font-size:22px;font-weight:800;color:${p.precoDe ? "#dc2626" : "#18181b"}">${esc(p.preco)}</p>`
    : ""
}
<p style="margin:10px 0 0"><a href="${esc(link)}" style="font-size:13px;font-weight:800;color:${cor};text-decoration:none">${p.preco ? tx(d, "Pedir ahora", "Pedir agora") : tx(d, "Cotizar", "Orçamento")} &rarr;</a></p>
</td></tr></table></td>`;
}

export function renderEmail(c: ConteudoEmail, d: DadosRender): string {
  if (c.blocos?.length) return renderBlocos(c, d);
  const cor = /^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor : "#0b7a3b";
  const titulo = personalizar(c.titulo || "", d.nome);
  const texto = personalizar(c.texto || "", d.nome);
  const preheader = personalizar(d.preheader || "", d.nome);
  const cab = c.cabecalho ? urlAbsoluta(c.cabecalho, d.origem) : "";
  const linhas: string[] = [];
  for (let i = 0; i < c.produtos.length; i += 2) {
    const par = c.produtos.slice(i, i + 2);
    // Um produto só (oferta): cartão na largura toda
    if (c.produtos.length === 1)
      linhas.push(`<tr>${cartaoProduto(par[0], d, cor, !!c.fotos, "100%")}</tr>`);
    else
      linhas.push(
        `<tr>${par.map((p) => cartaoProduto(p, d, cor, !!c.fotos)).join("")}${par.length === 1 ? '<td width="50%"></td>' : ""}</tr>`,
      );
  }

  return `<!doctype html>
<html lang="${d.idioma === "pt" ? "pt-BR" : "es"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#eef1ea">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1ea"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#06321b;padding:16px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td><a href="${esc(comUtm("/", d))}" style="text-decoration:none"><img src="${esc(d.origem)}/logo.png" alt="AGRO PARTS" width="40" height="40" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px">
<span style="${fonte};font-size:19px;font-weight:800;color:#ffffff;vertical-align:middle;margin-left:8px">AGRO PARTS</span></a></td>
<td align="right" style="${fonte};font-size:12px;color:#a7d7b6">${tx(d, "Repuestos agrícolas · Uruguay", "Peças agrícolas · Sul do Brasil")}</td>
</tr></table></td></tr>
${cab ? `<tr><td>${c.cabecalhoLink ? `<a href="${esc(comUtm(c.cabecalhoLink, d))}">` : ""}<img src="${esc(cab)}" alt="${esc(titulo)}" width="600" style="display:block;width:100%;height:auto;border:0">${c.cabecalhoLink ? "</a>" : ""}</td></tr>` : ""}
<tr><td style="padding:30px 30px 10px;${fonte}">
${c.destaque ? `<span style="display:inline-block;background:#fbbf24;color:#06321b;font-size:12px;font-weight:800;letter-spacing:1px;padding:6px 12px;border-radius:999px;text-transform:uppercase">${esc(c.destaque)}</span>` : ""}
<h1 style="margin:${c.destaque ? "14px" : "0"} 0 16px;font-size:26px;line-height:1.25;color:#06321b;font-weight:800">${esc(titulo)}</h1>
${formatarTexto(texto, d, cor)}
</td></tr>
${
  c.cupom?.codigo
    ? `<tr><td style="padding:4px 30px 10px;${fonte}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px dashed ${cor};border-radius:16px;background:#fffbeb"><tr><td align="center" style="padding:20px 16px">
${c.cupom.texto ? `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#3f3f46">${esc(c.cupom.texto)}</p>` : ""}
<p style="margin:0;font-size:12px;font-weight:800;letter-spacing:2px;color:#71717a">${tx(d, "TU CÓDIGO", "SEU CÓDIGO")}</p>
<p style="margin:6px 0 0;font-family:'Courier New',monospace;font-size:32px;font-weight:800;letter-spacing:4px;color:${cor}">${esc(c.cupom.codigo)}</p>
${c.cupom.validade ? `<p style="margin:8px 0 0;font-size:12px;color:#71717a">Válido ${esc(c.cupom.validade)}</p>` : ""}
</td></tr></table></td></tr>`
    : ""
}
${
  c.produtos.length
    ? `<tr><td style="padding:6px 24px 6px;${fonte}">${c.produtosTitulo ? `<p style="margin:0 6px 8px;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${cor}">${esc(c.produtosTitulo)}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhas.join("")}</table></td></tr>`
    : ""
}
${c.botaoTexto && c.botaoUrl ? `<tr><td align="center" style="padding:22px 30px 6px">${botao(c.botaoTexto, comUtm(c.botaoUrl, d), cor)}</td></tr>` : ""}
${c.whatsapp && d.whatsappUrl ? `<tr><td align="center" style="padding:12px 30px 4px">${botao(tx(d, "Cotizar por WhatsApp", "Pedir pelo WhatsApp"), d.whatsappUrl, "#25D366")}</td></tr>` : ""}
${d.anuncio && !c.semAnuncio ? anuncioHtml(d.anuncio, d, { cor }) : ""}
<tr><td style="padding:26px 30px 30px;${fonte}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f2;border-radius:14px"><tr>
<td style="padding:14px;font-size:13px;color:#3f3f46;text-align:center">💬 ${tx(d, "Atención por WhatsApp", "Atendimento pelo WhatsApp")} &nbsp;·&nbsp; 🔒 ${tx(d, "Sitio seguro", "Site seguro")}</td>
</tr></table></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px"><tr><td style="padding:18px 20px;${fonte};font-size:12px;line-height:1.6;color:#71717a;text-align:center">
${tx(d, "Recibís este e-mail porque tenés una cuenta en", "Você recebe este e-mail porque tem uma conta na")} <a href="${esc(comUtm("/", d))}" style="color:#71717a">AGRO PARTS</a>.${d.enderecoRodape ? `<br>${esc(d.enderecoRodape)}` : ""}
${d.urlBaixa ? `<br><a href="${esc(d.urlBaixa)}" style="color:#71717a;text-decoration:underline">${tx(d, "Darme de baja de estos e-mails", "Não quero mais receber estes e-mails")}</a>` : ""}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

// Versão em texto puro (melhora a entrega e aparece em leitores sem HTML)
export function textoEmail(c: ConteudoEmail, d: DadosRender): string {
  if (c.blocos?.length) return textoBlocos(c, d);
  const limpo = (s: string) =>
    personalizar(s, d.nome)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
  const partes = [c.destaque ?? "", limpo(c.titulo), limpo(c.texto)];
  if (c.cupom?.codigo)
    partes.push(
      [
        c.cupom.texto,
        `${tx(d, "Tu código", "Seu código")}: ${c.cupom.codigo}`,
        c.cupom.validade ? `Válido ${c.cupom.validade}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  if (c.produtos.length) {
    partes.push(
      (c.produtosTitulo ?? "") +
        "\n" +
        c.produtos
          .map(
            (p) =>
              `- ${p.quantidade ? p.quantidade + "x " : ""}${p.nome}${p.codigo ? ` (Cód: ${p.codigo})` : ""}${p.preco ? ` · ${p.precoDe ? `${tx(d, "antes", "antes")} ${p.precoDe}, ${tx(d, "ahora", "agora")} ` : ""}${p.preco}` : ""}: ${comUtm(`/produto/${encodeURIComponent(p.sku)}`, d)}`,
          )
          .join("\n"),
    );
  }
  if (c.botaoTexto && c.botaoUrl) partes.push(`${c.botaoTexto}: ${comUtm(c.botaoUrl, d)}`);
  if (c.whatsapp && d.whatsappUrl)
    partes.push(`${tx(d, "Cotizar por WhatsApp", "Pedir pelo WhatsApp")}: ${d.whatsappUrl}`);
  if (d.anuncio && !c.semAnuncio)
    partes.push(
      `${d.anuncio.titulo}${d.anuncio.texto ? `\n${d.anuncio.texto}` : ""}\n${linkAnuncio(d.anuncio, d)}`,
    );
  partes.push(
    tx(
      d,
      "AGRO PARTS · Repuestos agrícolas · Atención por WhatsApp",
      "AGRO PARTS · Peças agrícolas · Atendimento pelo WhatsApp",
    ),
  );
  if (d.urlBaixa) partes.push(`${tx(d, "Darme de baja", "Cancelar os e-mails")}: ${d.urlBaixa}`);
  return partes.filter((p) => p.trim()).join("\n\n");
}
