// Emissor de NF-e: Focus NFe (focusnfe.com.br). Ela assina a nota com o certificado digital do
// CNPJ (enviado uma vez no painel dela), manda para a SEFAZ-RS e devolve o PDF (DANFE) e o XML.
// - Homologação (teste, sem valor fiscal): homologacao.focusnfe.com.br
// - Produção: api.focusnfe.com.br
// FOCUS_NFE_URL troca o endereço (testes do CI usam uma API falsa).
// Autenticação: token como usuário do Basic Auth, senha vazia.

export type Ambiente = "homologacao" | "producao";

export type RespostaFocus = {
  status?: string; // processando_autorizacao, autorizado, cancelado, erro_autorizacao, denegado
  status_sefaz?: string;
  mensagem_sefaz?: string;
  numero?: string;
  serie?: string;
  chave_nfe?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  codigo?: string;
  mensagem?: string;
  erros?: Array<{ codigo?: string; mensagem?: string; campo?: string }>;
};

export const baseFocus = (amb: Ambiente) =>
  (
    process.env.FOCUS_NFE_URL ||
    (amb === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br")
  ).replace(/\/$/, "");

async function chamar(
  amb: Ambiente,
  token: string,
  metodo: "GET" | "POST" | "DELETE",
  caminho: string,
  corpo?: unknown,
): Promise<{ http: number; dados: RespostaFocus }> {
  const r = await fetch(baseFocus(amb) + caminho, {
    method: metodo,
    headers: {
      authorization: "Basic " + Buffer.from(`${token}:`).toString("base64"),
      ...(corpo ? { "content-type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const texto = await r.text();
  let dados: RespostaFocus = {};
  try {
    dados = JSON.parse(texto);
  } catch {
    dados = { mensagem: texto.slice(0, 300) };
  }
  return { http: r.status, dados };
}

export const enviarNfe = (amb: Ambiente, token: string, ref: string, nota: unknown) =>
  chamar(amb, token, "POST", `/v2/nfe?ref=${encodeURIComponent(ref)}`, nota);
export const consultarNfe = (amb: Ambiente, token: string, ref: string) =>
  chamar(amb, token, "GET", `/v2/nfe/${encodeURIComponent(ref)}`);
export const cancelarNfe = (amb: Ambiente, token: string, ref: string, justificativa: string) =>
  chamar(amb, token, "DELETE", `/v2/nfe/${encodeURIComponent(ref)}`, { justificativa });
// A Focus manda o PDF e o XML da nota por e-mail (com o remetente dela)
export const emailNfe = (amb: Ambiente, token: string, ref: string, emails: string[]) =>
  chamar(amb, token, "POST", `/v2/nfe/${encodeURIComponent(ref)}/email`, { emails });

// Mensagem legível de um erro da Focus/SEFAZ
export function textoErro(d: RespostaFocus, http: number) {
  const partes = [
    d.mensagem_sefaz,
    d.mensagem,
    ...(d.erros ?? []).map((e) => [e.campo, e.mensagem].filter(Boolean).join(": ")),
  ].filter(Boolean);
  if (http === 401 || http === 403) partes.unshift("Token da Focus NFe inválido ou sem acesso.");
  return [...new Set(partes)].join(" · ") || `Erro ${http} no emissor`;
}
