// Respostas das APIs públicas no idioma da página: o site manda o cabeçalho "x-idioma: pt" nas
// páginas em português (/pt/...). As mensagens são escritas em espanhol no código; aqui ficam as
// versões em português, aplicadas por comIdioma() no campo "error" da resposta.
import type { Idioma } from "./idioma";

const PT: Record<string, string> = {
  "El e-mail no es válido.": "O e-mail não é válido.",
  "El ingreso con código no está disponible. Entrá con Google o con tu contraseña.":
    "O acesso por código não está disponível. Entre com Google ou com sua senha.",
  "No pudimos enviar el código. Probá de nuevo.": "Não conseguimos enviar o código. Tente de novo.",
  "No pudimos verificar el código. Probá de nuevo.":
    "Não conseguimos verificar o código. Tente de novo.",
  "La verificación venció. Pedí un código nuevo.": "A verificação expirou. Peça um código novo.",
  "El celular debe ser uruguayo: 09X XXX XXX.": "O celular deve ser uruguaio: 09X XXX XXX.",
  "No pudimos crear la cuenta. Probá de nuevo.": "Não conseguimos criar a conta. Tente de novo.",
  "Completá el e-mail y la contraseña.": "Preencha o e-mail e a senha.",
  "Demasiados intentos. Esperá 15 minutos y probá de nuevo.":
    "Muitas tentativas. Espere 15 minutos e tente de novo.",
  "Esta cuenta entra con un código por e-mail. Tocá «Recibir código».":
    "Esta conta entra com um código por e-mail. Toque em «Quero meu cupom».",
  "Esta cuenta se creó con Google. Tocá «Continuar con Google».":
    "Esta conta foi criada com Google. Toque em «Continuar com Google».",
  "E-mail o contraseña incorrectos.": "E-mail ou senha incorretos.",
  "No pudimos iniciar sesión. Probá de nuevo.": "Não conseguimos entrar. Tente de novo.",
  "Pediste varios códigos. Esperá unos minutos y probá de nuevo.":
    "Você pediu vários códigos. Espere alguns minutos e tente de novo.",
  "El código venció. Pedí uno nuevo.": "O código expirou. Peça um novo.",
  "Demasiados intentos. Pedí un código nuevo.": "Muitas tentativas. Peça um código novo.",
  "Código incorrecto. Revisalo y probá de nuevo.": "Código incorreto. Confira e tente de novo.",
  "Escribí tu nombre completo.": "Digite seu nome completo.",
  "La contraseña debe tener al menos 8 caracteres, con letras y números.":
    "A senha deve ter pelo menos 8 caracteres, com letras e números.",
  "Las contraseñas no coinciden.": "As senhas não coincidem.",
  "Aceptá los términos para crear la cuenta.": "Aceite os termos para criar a conta.",
  "Ya existe una cuenta con este e-mail. Ingresá con tu contraseña o con Google.":
    "Já existe uma conta com este e-mail. Entre com sua senha ou com Google.",
};

export const idiomaDaRequisicao = (request: Request): Idioma =>
  request.headers.get("x-idioma") === "pt" ? "pt" : "es";

export const msgPt = (es: string) => PT[es] ?? es;

// Envolve o handler de uma rota: em português, traduz o "error" das respostas JSON
export function comIdioma<A extends { request: Request }>(handler: (args: A) => Promise<Response>) {
  return async (args: A): Promise<Response> => {
    const resposta = await handler(args);
    if (idiomaDaRequisicao(args.request) !== "pt" || resposta.ok) return resposta;
    if (!(resposta.headers.get("content-type") || "").includes("json")) return resposta;
    const j = await resposta
      .clone()
      .json()
      .catch(() => null);
    if (!j || typeof j.error !== "string" || !(j.error in PT)) return resposta;
    return Response.json(
      { ...j, error: PT[j.error] },
      { status: resposta.status, headers: resposta.headers },
    );
  };
}
