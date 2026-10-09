// Modelo dos e-mails (campanhas e lembrete de carrinho). Código puro: roda no navegador
// (prévia ao vivo no editor do admin) e no servidor (envio pelo Resend).
// HTML em tabelas e estilos inline, que é o que Gmail, Outlook e celulares entendem.

export type ProdutoEmail = { sku: string; nome: string; codigo?: string | null; imagem?: string | null; quantidade?: number };

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
  cor: string;
};

export type Publico = {
  tipo: "todos" | "departamentos" | "carrinho" | "catalogos" | "recentes" | "inativos";
  departamentos: string[];
  dias: number;
};

export const PUBLICOS: { valor: Publico["tipo"]; rotulo: string; usaDias?: boolean }[] = [
  { valor: "todos", rotulo: "Todos os clientes cadastrados" },
  { valor: "departamentos", rotulo: "Clientes de departamentos específicos" },
  { valor: "carrinho", rotulo: "Montaram carrinho nos últimos N dias", usaDias: true },
  { valor: "catalogos", rotulo: "Abriram catálogos nos últimos N dias", usaDias: true },
  { valor: "recentes", rotulo: "Cadastrados nos últimos N dias", usaDias: true },
  { valor: "inativos", rotulo: "Sem entrar no site há mais de N dias", usaDias: true },
];

export const PUBLICO_PADRAO: Publico = { tipo: "todos", departamentos: [], dias: 30 };

export const CONTEUDO_PADRAO: ConteudoEmail = {
  destaque: "OFERTAS DEL MES",
  titulo: "¡Hola {{nombre}}! Repuestos para tu tractor con envío a todo Uruguay",
  texto:
    "Seleccionamos repuestos con **precio especial** para este mes.\n\nPedí tu cotización por WhatsApp y te respondemos con precio y disponibilidad. Enviamos por DAC a todo el país.",
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
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const primeiroNome = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] ?? "";

// {{nombre}} vira o primeiro nome; sem nome, some junto com o espaço/vírgula antes dele
export function personalizar(s: string, nome?: string | null) {
  const p = primeiroNome(nome);
  const nomeFmt = p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
  return nomeFmt ? s.replace(/\{\{\s*nombre\s*\}\}/gi, nomeFmt) : s.replace(/[ ,]*\{\{\s*nombre\s*\}\}/gi, "");
}

export function urlAbsoluta(u: string | null | undefined, origem: string) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return origem + u;
  return `${origem}/uploads/${u}`;
}

// Links para o próprio site levam UTM, para a campanha aparecer no painel de Visitantes
function comUtm(u: string, d: DadosRender) {
  const abs = urlAbsoluta(u, d.origem);
  if (!abs.startsWith(d.origem) || !d.campanha) return abs;
  const url = new URL(abs);
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", d.campanha);
  return url.toString();
}

function formatarTexto(t: string, d: DadosRender, cor: string) {
  return t
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => {
      let h = esc(p.trim());
      h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, txt, href) => `<a href="${esc(comUtm(href.replace(/&amp;/g, "&"), d))}" style="color:${cor};font-weight:700">${txt}</a>`);
      h = h.replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f46">${h}</p>`;
    })
    .join("");
}

const fonte = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function botao(texto: string, href: string, fundo: string, corTexto = "#ffffff") {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td style="border-radius:12px;background:${fundo}">
<a href="${esc(href)}" style="display:inline-block;padding:15px 30px;${fonte};font-size:16px;font-weight:800;color:${corTexto};text-decoration:none;border-radius:12px">${esc(texto)}</a>
</td></tr></table>`;
}

function cartaoProduto(p: ProdutoEmail, d: DadosRender, cor: string, fotos: boolean) {
  const link = comUtm(`/produto/${encodeURIComponent(p.sku)}`, d);
  const img = fotos && p.imagem && !p.imagem.includes("redeparts") ? urlAbsoluta(p.imagem, d.origem) : "";
  return `<td width="50%" valign="top" style="padding:6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:14px">
<tr><td align="center" style="padding:14px 14px 0"><a href="${esc(link)}" style="text-decoration:none">${
    img
      ? `<img src="${esc(img)}" alt="${esc(p.nome)}" width="200" style="display:block;width:100%;max-width:200px;height:160px;object-fit:contain;border:0">`
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="height:110px;background:#f0f6ef;border-radius:10px;${fonte}"><p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1px;color:#71717a">CÓDIGO</p><p style="margin:4px 0 0;font-size:20px;font-weight:800;color:${cor}">${esc(p.codigo || p.sku)}</p></td></tr></table>`
  }</a></td></tr>
<tr><td style="padding:10px 14px 14px;${fonte}">
<p style="margin:0;font-size:14px;font-weight:700;line-height:1.35;color:#18181b">${p.quantidade ? `${p.quantidade}× ` : ""}${esc(p.nome)}</p>
${p.codigo && img ? `<p style="margin:4px 0 0;font-size:12px;color:#71717a">Cód: ${esc(p.codigo)}</p>` : ""}
<p style="margin:10px 0 0"><a href="${esc(link)}" style="font-size:13px;font-weight:800;color:${cor};text-decoration:none">Cotizar &rarr;</a></p>
</td></tr></table></td>`;
}

export function renderEmail(c: ConteudoEmail, d: DadosRender): string {
  const cor = /^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor : "#0b7a3b";
  const titulo = personalizar(c.titulo || "", d.nome);
  const texto = personalizar(c.texto || "", d.nome);
  const preheader = personalizar(d.preheader || "", d.nome);
  const cab = c.cabecalho ? urlAbsoluta(c.cabecalho, d.origem) : "";
  const linhas: string[] = [];
  for (let i = 0; i < c.produtos.length; i += 2) {
    const par = c.produtos.slice(i, i + 2);
    linhas.push(`<tr>${par.map((p) => cartaoProduto(p, d, cor, !!c.fotos)).join("")}${par.length === 1 ? '<td width="50%"></td>' : ""}</tr>`);
  }

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#eef1ea">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1ea"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#06321b;padding:16px 22px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td><a href="${esc(comUtm("/", d))}" style="text-decoration:none"><img src="${esc(d.origem)}/logo.png" alt="AGRO PARTS" width="40" height="40" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px">
<span style="${fonte};font-size:19px;font-weight:800;color:#ffffff;vertical-align:middle;margin-left:8px">AGRO PARTS</span></a></td>
<td align="right" style="${fonte};font-size:12px;color:#a7d7b6">Repuestos agrícolas · Uruguay</td>
</tr></table></td></tr>
${cab ? `<tr><td>${c.cabecalhoLink ? `<a href="${esc(comUtm(c.cabecalhoLink, d))}">` : ""}<img src="${esc(cab)}" alt="${esc(titulo)}" width="600" style="display:block;width:100%;height:auto;border:0">${c.cabecalhoLink ? "</a>" : ""}</td></tr>` : ""}
<tr><td style="padding:30px 30px 10px;${fonte}">
${c.destaque ? `<span style="display:inline-block;background:#fbbf24;color:#06321b;font-size:12px;font-weight:800;letter-spacing:1px;padding:6px 12px;border-radius:999px;text-transform:uppercase">${esc(c.destaque)}</span>` : ""}
<h1 style="margin:${c.destaque ? "14px" : "0"} 0 16px;font-size:26px;line-height:1.25;color:#06321b;font-weight:800">${esc(titulo)}</h1>
${formatarTexto(texto, d, cor)}
</td></tr>
${
  c.produtos.length
    ? `<tr><td style="padding:6px 24px 6px;${fonte}">${c.produtosTitulo ? `<p style="margin:0 6px 8px;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${cor}">${esc(c.produtosTitulo)}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhas.join("")}</table></td></tr>`
    : ""
}
${c.botaoTexto && c.botaoUrl ? `<tr><td align="center" style="padding:22px 30px 6px">${botao(c.botaoTexto, comUtm(c.botaoUrl, d), cor)}</td></tr>` : ""}
${c.whatsapp && d.whatsappUrl ? `<tr><td align="center" style="padding:12px 30px 4px">${botao("Cotizar por WhatsApp", d.whatsappUrl, "#25D366")}</td></tr>` : ""}
<tr><td style="padding:26px 30px 30px;${fonte}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f2;border-radius:14px"><tr>
<td style="padding:14px;font-size:13px;color:#3f3f46;text-align:center">🚚 Envíos por DAC a todo Uruguay &nbsp;·&nbsp; 💬 Atención por WhatsApp &nbsp;·&nbsp; 🔒 Sitio seguro</td>
</tr></table></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px"><tr><td style="padding:18px 20px;${fonte};font-size:12px;line-height:1.6;color:#71717a;text-align:center">
Recibís este e-mail porque tenés una cuenta en <a href="${esc(comUtm("/", d))}" style="color:#71717a">AGRO PARTS</a>.${d.enderecoRodape ? `<br>${esc(d.enderecoRodape)}` : ""}
${d.urlBaixa ? `<br><a href="${esc(d.urlBaixa)}" style="color:#71717a;text-decoration:underline">Darme de baja de estos e-mails</a>` : ""}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

// Versão em texto puro (melhora a entrega e aparece em leitores sem HTML)
export function textoEmail(c: ConteudoEmail, d: DadosRender): string {
  const limpo = (s: string) => personalizar(s, d.nome).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
  const partes = [c.destaque ?? "", limpo(c.titulo), limpo(c.texto)];
  if (c.produtos.length) {
    partes.push((c.produtosTitulo ?? "") + "\n" + c.produtos.map((p) => `- ${p.quantidade ? p.quantidade + "x " : ""}${p.nome}${p.codigo ? ` (Cód: ${p.codigo})` : ""}: ${comUtm(`/produto/${encodeURIComponent(p.sku)}`, d)}`).join("\n"));
  }
  if (c.botaoTexto && c.botaoUrl) partes.push(`${c.botaoTexto}: ${comUtm(c.botaoUrl, d)}`);
  if (c.whatsapp && d.whatsappUrl) partes.push(`Cotizar por WhatsApp: ${d.whatsappUrl}`);
  partes.push("AGRO PARTS · Repuestos agrícolas · Envíos a todo Uruguay");
  if (d.urlBaixa) partes.push(`Darme de baja: ${d.urlBaixa}`);
  return partes.filter((p) => p.trim()).join("\n\n");
}
