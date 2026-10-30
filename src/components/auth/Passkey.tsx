import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ScanFace, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { minhasPasskeysFn, removerPasskeyFn } from "@/lib/passkeys";
import { useT, type Idioma } from "@/lib/idioma";
import { cn } from "@/lib/utils";

// Entrar com Face ID / Touch ID / digital / Windows Hello (passkeys). Servidor:
// src/lib/passkey.server.ts. A biblioteca do navegador carrega quando o botão aparece.

// O nome que a pessoa conhece no aparelho dela
export function nomeBiometria(idioma: Idioma) {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return "Face ID";
  if (/Macintosh/i.test(ua)) return "Touch ID";
  if (/Windows/i.test(ua)) return "Windows Hello";
  if (/Android/i.test(ua)) return idioma === "pt" ? "digital" : "huella";
  return idioma === "pt" ? "Face ID ou digital" : "Face ID o huella";
}

export function useSuportaPasskey() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(typeof window !== "undefined" && !!window.PublicKeyCredential);
  }, []);
  return ok;
}

const ERROS: Record<string, [string, string]> = {
  desconhecida: [
    "Este dispositivo ya no está activado. Entrá con tu e-mail y activalo de nuevo en Mi cuenta.",
    "Este aparelho não está mais ativado. Entre com seu e-mail e ative de novo em Minha conta.",
  ],
  expirou: ["Pasó mucho tiempo. Probá de nuevo.", "Demorou demais. Tente de novo."],
  dominio: [
    "Abrí el sitio en agropartsuy.com para usar esta opción.",
    "Abra o site em agropartsuy.com para usar esta opção.",
  ],
  limite: ["Muchos intentos. Esperá unos minutos.", "Muitas tentativas. Espere alguns minutos."],
  login: ["Ingresá a tu cuenta primero.", "Entre na sua conta primeiro."],
};
const msg = (codigo: string, idioma: Idioma) =>
  (ERROS[codigo] ?? ["No funcionó. Probá de nuevo.", "Não funcionou. Tente de novo."])[
    idioma === "pt" ? 1 : 0
  ];
// Cancelou no aparelho (ou fechou a janela): não é erro
const cancelou = (e: any) =>
  e?.name === "NotAllowedError" || e?.name === "AbortError" || e?.code === "ERROR_CEREMONY_ABORTED";

async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "erro"), { codigo: j.error || "erro" });
  return j;
}

// O iPhone (Safari) só abre o Face ID se ele for chamado logo no toque: esperar o servidor ou
// carregar a biblioteca antes faz o Safari recusar em silêncio. Por isso a biblioteca e o desafio
// ficam prontos antes (usePreparo) e o toque chama a biometria na hora.
type Tipo = "registro" | "login";
type Preparo = { opcoes: any; token: string; em: number };
let biblioteca: typeof import("@simplewebauthn/browser") | null = null;
const carregar = async () => (biblioteca ??= await import("@simplewebauthn/browser"));
const VALE = 4 * 60_000; // o desafio vale 5 min no servidor
const preparar = async (tipo: Tipo): Promise<Preparo> => {
  const [, j] = await Promise.all([carregar(), post("/api/auth/passkey/opcoes", { tipo })]);
  return { ...j, em: Date.now() };
};
const valido = (p?: Preparo | null) => (p && Date.now() - p.em < VALE ? p : null);

// Deixa pronto (e renova) o desafio enquanto o botão está na tela
function usePreparo(tipo: Tipo, ativo: boolean) {
  const [preparo, setPreparo] = useState<Preparo | null>(null);
  const [rodada, setRodada] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    preparar(tipo)
      .then((p) => vivo && setPreparo(p))
      .catch(() => vivo && setPreparo(null));
    const t = setTimeout(() => setRodada((n) => n + 1), VALE);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [tipo, ativo, rodada]);
  // Cada desafio vale uma vez: depois de usar, pega outro
  return { preparo, renovar: () => setRodada((n) => n + 1) };
}

// Recusa em menos de 1 s, sem a janela aparecer: o navegador bloqueou (não foi a pessoa)
const bloqueado = (e: any, inicio: number) => cancelou(e) && Date.now() - inicio < 1000;

// Entrar: o aparelho mostra as contas salvas, a pessoa confirma com a biometria
export async function entrarComPasskey(redirect?: string, pronto?: Preparo | null) {
  const p = valido(pronto) ?? (await preparar("login"));
  const resposta = await biblioteca!.startAuthentication({ optionsJSON: p.opcoes });
  return post("/api/auth/passkey/verificar", {
    tipo: "login",
    token: p.token,
    resposta,
    redirect,
  }) as Promise<{
    destino: string;
    role: string;
  }>;
}

// Ativar neste aparelho (logado)
export async function ativarPasskey(pronto?: Preparo | null) {
  const p = valido(pronto) ?? (await preparar("registro"));
  const resposta = await biblioteca!.startRegistration({ optionsJSON: p.opcoes });
  return post("/api/auth/passkey/verificar", { tipo: "registro", token: p.token, resposta });
}

const TOQUE_DE_NOVO: [string, string] = [
  "Tocá de nuevo para abrir el Face ID / huella.",
  "Toque de novo para abrir o Face ID / digital.",
];

// Botão "Entrar con Face ID" (login e pop-up). Some nos navegadores sem suporte.
export function BotaoPasskey({
  redirect,
  className,
  aoErro,
  discreto,
  depois,
}: {
  redirect?: string;
  className?: string;
  aoErro?: (m: string) => void;
  discreto?: boolean; // link de texto (pop-up), não o botão grande
  depois?: React.ReactNode; // ex.: separador "o" (só aparece junto com o botão)
}) {
  const { t, idioma } = useT();
  const suporta = useSuportaPasskey();
  const [ocupado, setOcupado] = useState(false);
  const { preparo, renovar } = usePreparo("login", suporta);
  if (!suporta) return null;
  const entrar = async () => {
    const inicio = Date.now();
    setOcupado(true);
    try {
      const r = await entrarComPasskey(redirect, preparo);
      // Recarrega para o site inteiro pegar a sessão
      window.location.href = r.destino || redirect || "/cuenta";
    } catch (e: any) {
      if (bloqueado(e, inicio)) aoErro?.(TOQUE_DE_NOVO[idioma === "pt" ? 1 : 0]);
      else if (!cancelou(e)) aoErro?.(msg(e?.codigo ?? "", idioma));
      setOcupado(false);
      renovar();
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={entrar}
        disabled={ocupado}
        className={cn(
          discreto
            ? "flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-zinc-700 hover:underline disabled:opacity-60"
            : "flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-zinc-900 bg-zinc-900 text-base font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60",
          className,
        )}
      >
        {ocupado ? (
          <Loader2 className={discreto ? "h-4 w-4 animate-spin" : "h-5 w-5 animate-spin"} />
        ) : (
          <ScanFace className={discreto ? "h-4 w-4" : "h-5 w-5"} />
        )}
        {t(`Entrar con ${nomeBiometria(idioma)}`, `Entrar com ${nomeBiometria(idioma)}`)}
      </button>
      {depois}
    </>
  );
}

// Oferta de um toque logo depois de entrar/criar a conta (pop-up): ninguém precisa ir até
// Mi cuenta. Aparece uma vez por aparelho; "Ahora no" ou fechar não pergunta de novo.
export const OFERTA_PASSKEY = "passkey_oferta_vista";
export function ofertaPasskeyPendente() {
  try {
    return !!window.PublicKeyCredential && !localStorage.getItem(OFERTA_PASSKEY);
  } catch {
    return false;
  }
}
export function OfertaPasskey({ aoFechar }: { aoFechar?: () => void }) {
  const { t, idioma } = useT();
  const [estado, setEstado] = useState<"pergunta" | "ocupado" | "ok" | "fechada">("pergunta");
  const [erro, setErro] = useState<string | null>(null);
  const bio = nomeBiometria(idioma);
  const { preparo, renovar } = usePreparo("registro", estado === "pergunta");
  // Marca como vista ao aparecer: se a pessoa ignorar e fechar, não volta
  useEffect(() => {
    try {
      localStorage.setItem(OFERTA_PASSKEY, String(Date.now()));
    } catch {
      /* modo privado */
    }
  }, []);
  if (estado === "fechada") return null;
  if (estado === "ok")
    return (
      <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
        <Check className="h-4 w-4" />
        {t(`¡Listo! La próxima vez entrá con ${bio}.`, `Pronto! Da próxima vez, entre com ${bio}.`)}
      </p>
    );
  const ativar = async () => {
    const inicio = Date.now();
    setErro(null);
    setEstado("ocupado");
    try {
      await ativarPasskey(preparo);
      setEstado("ok");
    } catch (e: any) {
      if (e?.name === "InvalidStateError") {
        setEstado("ok");
      } else {
        if (bloqueado(e, inicio)) setErro(TOQUE_DE_NOVO[idioma === "pt" ? 1 : 0]);
        else if (!cancelou(e)) setErro(msg(e?.codigo ?? "", idioma));
        setEstado("pergunta");
        renovar();
      }
    }
  };
  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 p-4 text-left">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
          <ScanFace className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold text-zinc-900">
            {t("¿Entrar más rápido la próxima vez?", "Entrar mais rápido da próxima vez?")}
          </p>
          <p className="text-sm text-zinc-600">
            {t(
              `Con ${bio}: sin códigos ni contraseña. Tu cara o huella quedan en tu celular.`,
              `Com ${bio}: sem códigos nem senha. Seu rosto ou digital ficam no seu celular.`,
            )}
          </p>
        </div>
      </div>
      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={ativar}
          disabled={estado === "ocupado"}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 font-bold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {estado === "ocupado" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ScanFace className="h-4 w-4" />
          )}
          {t(`Activar ${bio}`, `Ativar ${bio}`)}
        </button>
        <button
          type="button"
          onClick={() => {
            setEstado("fechada");
            aoFechar?.();
          }}
          className="h-11 rounded-xl px-3 text-sm font-semibold text-zinc-500 hover:bg-zinc-50"
        >
          {t("Ahora no", "Agora não")}
        </button>
      </div>
    </div>
  );
}

// Mi cuenta → Seguridad: ativar neste aparelho e ver/remover os aparelhos ativados
export function PasskeysConta() {
  const { t, idioma } = useT();
  const qc = useQueryClient();
  const suporta = useSuportaPasskey();
  const { data } = useQuery({ queryKey: ["minhas-passkeys"], queryFn: () => minhasPasskeysFn() });
  const [ocupado, setOcupado] = useState(false);
  const bio = nomeBiometria(idioma);
  const { preparo, renovar } = usePreparo("registro", suporta && !ocupado);

  const ativar = async () => {
    const inicio = Date.now();
    setOcupado(true);
    try {
      await ativarPasskey(preparo);
      toast.success(
        t(`¡Listo! La próxima vez entrá con ${bio}.`, `Pronto! Da próxima vez, entre com ${bio}.`),
      );
      qc.invalidateQueries({ queryKey: ["minhas-passkeys"] });
    } catch (e: any) {
      if (e?.name === "InvalidStateError")
        toast.info(t("Este dispositivo ya está activado.", "Este aparelho já está ativado."));
      else if (bloqueado(e, inicio)) toast.info(TOQUE_DE_NOVO[idioma === "pt" ? 1 : 0]);
      else if (!cancelou(e)) toast.error(msg(e?.codigo ?? "", idioma));
    } finally {
      setOcupado(false);
      renovar();
    }
  };
  const remover = async (id: number) => {
    if (
      !confirm(
        t(
          "¿Quitar este dispositivo? Para volver a usarlo, activalo de nuevo.",
          "Remover este aparelho? Para usar de novo, ative outra vez.",
        ),
      )
    )
      return;
    await removerPasskeyFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["minhas-passkeys"] });
  };
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString(idioma === "pt" ? "pt-BR" : "es-UY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-3 rounded-2xl p-4 ring-1 ring-black/5">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
          <ScanFace className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold">{t(`Entrar con ${bio}`, `Entrar com ${bio}`)}</h3>
          <p className="text-sm text-zinc-600">
            {t(
              "Sin contraseña: tu cara o tu huella quedan en tu celular, nosotros nunca las vemos. Más rápido y más seguro.",
              "Sem senha: seu rosto ou sua digital ficam no seu celular, nós nunca vemos. Mais rápido e mais seguro.",
            )}
          </p>
        </div>
      </div>
      {data && data.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {data.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Smartphone className="h-4 w-4 text-zinc-500" />
              <span className="min-w-0 flex-1">
                <b>{p.aparelho}</b>
                <span className="block text-xs text-zinc-500">
                  {t("Activado el", "Ativado em")} {fmt(p.criado)}
                  {p.usado && ` · ${t("último uso", "último uso")} ${fmt(p.usado)}`}
                  {p.sincronizada &&
                    ` · ${t("sincronizado en tu cuenta Apple/Google", "sincronizado na sua conta Apple/Google")}`}
                </span>
              </span>
              <button
                onClick={() => remover(p.id)}
                aria-label={t("Quitar", "Remover")}
                className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {suporta ? (
        <button
          onClick={ativar}
          disabled={ocupado}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-bold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {data?.length
            ? t("Activar también en este dispositivo", "Ativar também neste aparelho")
            : t(`Activar ${bio} en este dispositivo`, `Ativar ${bio} neste aparelho`)}
        </button>
      ) : (
        <p className="text-xs text-zinc-500">
          {t(
            "Este navegador no permite entrar con biometría. Probá desde el celular.",
            "Este navegador não permite entrar com biometria. Tente pelo celular.",
          )}
        </p>
      )}
    </div>
  );
}
