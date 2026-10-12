import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { X, Loader2, Mail, KeyRound, ArrowLeft, BookOpen, Check, Copy, BadgePercent } from "lucide-react";
import { getSessionFn } from "@/lib/user-auth";
import { getPopupFn, meuCupomFn } from "@/lib/acesso";
import { DEPARTAMENTOS_UY, mascararCelularUY } from "@/lib/validacao-conta";
import { registrarEvento } from "@/lib/eventos";
import { cn } from "@/lib/utils";

// Pop-up "Entrá y ganá": aparece N segundos depois de abrir o site para quem não está logado.
// Login rápido com Google, código por e-mail ou senha; cadastro rápido; cupom único de 15%.
const FECHADO = "popup_acceso_fechado"; // quando fechou (não volta por 7 dias)
const FEITO = "popup_acceso_ok"; // já entrou/cadastrou por aqui
const SETE_DIAS = 7 * 86400_000;
const OCULTAR = [/^\/admin/, /^\/login/, /^\/cadastro/, /^\/cuenta/, /^\/baja/, /^\/catalogos\/ver/];

const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* modo privado */
  }
};

type Etapa = "inicio" | "codigo" | "cadastro" | "senha" | "ok";
const inputCls = "h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";

export function PopupAcesso() {
  const location = useLocation();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: sessao, isFetched } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const { data: cfg } = useQuery({ queryKey: ["popup_acesso"], queryFn: () => getPopupFn(), staleTime: 10 * 60_000 });
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [token, setToken] = useState("");
  const [dados, setDados] = useState({ nome: "", departamento: "", telefone: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [reenviar, setReenviar] = useState(0);
  const [resultado, setResultado] = useState<{ nome: string; cupom: string | null; usado?: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const primeiroCampo = useRef<HTMLInputElement>(null);
  const caminho = useRef(location.pathname);
  caminho.current = location.pathname;

  const permitido = (p: string) => !OCULTAR.some((r) => r.test(p));

  // Voltou do Google pelo pop-up (?bienvenida=1): mostra o cupom
  useEffect(() => {
    if (!sessao || typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (u.searchParams.get("bienvenida") !== "1") return;
    u.searchParams.delete("bienvenida");
    window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    meuCupomFn().then((r) => {
      if (!r) return;
      gravar(FEITO, "1");
      setResultado({ nome: r.nome, cupom: r.cupom, usado: r.usado });
      setEtapa("ok");
      setAberto(true);
      registrarEvento("popup", "login");
    });
  }, [sessao]);

  // Prévia pelo admin (?popup=preview): abre logo, mesmo logado ou já fechado
  useEffect(() => {
    if (!cfg || typeof window === "undefined") return;
    if (new URL(window.location.href).searchParams.get("popup") !== "preview") return;
    const t = setTimeout(() => setAberto(true), 800);
    return () => clearTimeout(t);
  }, [cfg]);

  // Abre N segundos depois de chegar, só para quem não está logado
  useEffect(() => {
    if (!cfg?.ativo || !isFetched || sessao) return;
    if (ler(FEITO)) return;
    const fechado = Number(ler(FECHADO) || 0);
    if (fechado && Date.now() - fechado < SETE_DIAS) return;
    // Conta desde a chegada na página (as consultas acima levam um tempo para responder)
    const falta = Math.max(500, cfg.segundos * 1000 - performance.now());
    const t = setTimeout(() => {
      if (!permitido(caminho.current)) return;
      setAberto(true);
      registrarEvento("popup", "visto");
    }, falta);
    return () => clearTimeout(t);
  }, [cfg, isFetched, sessao]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aberto) return;
    setTimeout(() => primeiroCampo.current?.focus(), 80);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, etapa]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reenviar <= 0) return;
    const t = setTimeout(() => setReenviar((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [reenviar]);

  if (!aberto || !cfg) return null;

  const desconto = cfg.desconto;
  const titulo = cfg.titulo.replace(/\{\{\s*descuento\s*\}\}/gi, String(desconto));

  function fechar() {
    if (etapa !== "ok") {
      gravar(FECHADO, String(Date.now()));
      registrarEvento("popup", "fechado");
    }
    setAberto(false);
  }

  const terminar = async (r: { nome: string; cupom: string | null; usado?: boolean }, acao: "cadastro" | "login", eventId?: string) => {
    gravar(FEITO, "1");
    registrarEvento("popup", acao, eventId);
    setResultado(r);
    setEtapa("ok");
    await qc.invalidateQueries({ queryKey: ["auth_session"] });
    router.invalidate();
  };

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Algo salió mal. Probá de nuevo.");
    return j;
  };

  const acao = (fn: () => Promise<void>) => async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await fn();
    } catch (err: any) {
      setErro(err?.message ?? "Algo salió mal.");
    } finally {
      setOcupado(false);
    }
  };

  const pedirCodigo = acao(async () => {
    await post("/api/auth/codigo", { email });
    registrarEvento("popup", "codigo");
    setCodigo("");
    setReenviar(240); // 4 minutos até liberar outro código
    setEtapa("codigo");
  });

  const verificar = acao(async () => {
    const j = await post("/api/auth/codigo/verificar", { email, codigo });
    if (j.novo) {
      setToken(j.token);
      setEtapa("cadastro");
    } else await terminar({ nome: j.nome, cupom: j.cupom, usado: j.cupomUsado }, "login");
  });

  const cadastrar = acao(async () => {
    const j = await post("/api/auth/rapido", { token, ...dados });
    // Mesmo event_id do servidor (cadastro_<id>): o Meta conta o cadastro uma vez
    await terminar({ nome: j.nome, cupom: j.cupom }, "cadastro", j.id ? `cadastro_${j.id}` : undefined);
  });

  const entrarComSenha = acao(async () => {
    await post("/api/auth/login", { email, senha });
    const r = await meuCupomFn();
    await terminar({ nome: r?.nome ?? "", cupom: r?.cupom ?? null, usado: r?.usado }, "login");
  });

  const googleUrl = () => {
    const u = new URL(window.location.href);
    u.searchParams.set("bienvenida", "1");
    return `/api/auth/google?redirect=${encodeURIComponent(u.pathname + u.search)}`;
  };

  const copiar = () => {
    if (!resultado?.cupom) return;
    navigator.clipboard?.writeText(resultado.cupom).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const primeiroNome = (resultado?.nome ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="popup-acesso-titulo">
      <div className="absolute inset-0 animate-in fade-in bg-black/60 backdrop-blur-[2px]" onClick={fechar} />
      <div className="relative flex max-h-[94vh] w-full animate-in slide-in-from-bottom-8 flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl duration-300 sm:max-w-[860px] sm:flex-row sm:rounded-3xl sm:zoom-in-95">
        <button onClick={fechar} aria-label="Cerrar" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60 sm:bg-zinc-100 sm:text-zinc-600 sm:hover:bg-zinc-200">
          <X className="h-5 w-5" />
        </button>

        {/* Imagem: lado esquerdo no computador, faixa no topo no celular */}
        <div className="relative h-36 shrink-0 overflow-hidden sm:h-auto sm:w-[340px]">
          <img src="/img/popup-acceso.jpg" alt="" className="h-full w-full object-cover object-top" />
          <div className="absolute bottom-2 right-14 flex h-24 w-24 rotate-[-10deg] flex-col items-center justify-center rounded-full border-4 border-[#fff3c4] bg-[#f2c94c] text-[#06321b] shadow-xl sm:bottom-auto sm:right-6 sm:top-[46%] sm:h-36 sm:w-36">
            <span className="text-3xl font-black leading-none sm:text-5xl">{desconto}%</span>
            <span className="text-xs font-black tracking-widest sm:text-base">OFF</span>
            <span className="text-[9px] font-extrabold sm:text-[11px]">1ª COMPRA</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {etapa === "ok" && resultado ? (
            <div className="flex h-full flex-col justify-center text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-8 w-8" /></span>
              <h2 id="popup-acesso-titulo" className="mt-4 text-2xl font-black text-zinc-900">¡Listo{primeiroNome ? `, ${primeiroNome}` : ""}!</h2>
              <p className="mt-1 text-zinc-600">Ya tenés acceso a todos los catálogos.</p>
              {resultado.cupom && !resultado.usado && (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-[#e0a800] bg-[#fffbeb] p-5">
                  <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-zinc-700"><BadgePercent className="h-4 w-4 text-[#b8860b]" /> Tu cupón de {desconto}% en la primera compra</p>
                  <button onClick={copiar} className="mx-auto mt-2 flex items-center gap-2 font-mono text-3xl font-black tracking-[0.2em] text-primary" title="Copiar">
                    {resultado.cupom} {copiado ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-zinc-400" />}
                  </button>
                  <p className="mt-2 text-xs text-zinc-500">Mencioná el código al pedir por WhatsApp. También lo encontrás en Mi cuenta.</p>
                </div>
              )}
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <a href="/catalogos" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white hover:bg-primary/90"><BookOpen className="h-5 w-5" /> Ver catálogos</a>
                <button onClick={() => setAberto(false)} className="h-12 rounded-xl border font-semibold text-zinc-700 hover:bg-zinc-50">Seguir navegando</button>
              </div>
            </div>
          ) : (
            <>
              {etapa !== "inicio" && (
                <button onClick={() => { setErro(null); setEtapa(etapa === "cadastro" ? "codigo" : "inicio"); }} className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-800">
                  <ArrowLeft className="h-4 w-4" /> Volver
                </button>
              )}
              <h2 id="popup-acesso-titulo" className="pr-8 text-2xl font-black leading-tight text-zinc-900 sm:text-[28px]">
                {etapa === "codigo" ? "Revisá tu e-mail" : etapa === "cadastro" ? "Último paso" : etapa === "senha" ? "Entrá con tu contraseña" : titulo}
              </h2>
              <p className="mt-2 text-[15px] text-zinc-600">
                {etapa === "codigo" ? <>Te enviamos un código de 6 dígitos a <b className="text-zinc-900">{email}</b>. Vale por 10 minutos; puede tardar un minuto en llegar.</> : etapa === "cadastro" ? "Contanos quién sos para crear tu cuenta y generar tu cupón." : etapa === "senha" ? "Si ya tenés cuenta con contraseña." : cfg.subtitulo}
              </p>

              {etapa === "inicio" && (
                <>
                  <ul className="mt-4 space-y-2 text-sm font-semibold text-zinc-800">
                    <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><BookOpen className="h-3.5 w-3.5" /></span> Todos los catálogos de tractores, gratis</li>
                    <li className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700"><BadgePercent className="h-3.5 w-3.5" /></span> {desconto}% de descuento en tu primera compra</li>
                  </ul>
                  {cfg.google && (
                    <a href={googleUrl()} className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 font-semibold text-zinc-800 transition hover:bg-zinc-50">
                      <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                      Continuar con Google
                    </a>
                  )}
                  {cfg.google && <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase text-zinc-400"><span className="h-px flex-1 bg-zinc-200" /> o con tu e-mail <span className="h-px flex-1 bg-zinc-200" /></div>}
                  <form onSubmit={cfg.codigo ? pedirCodigo : (e) => { e.preventDefault(); setEtapa("senha"); }} className={cn("space-y-3", !cfg.google && "mt-5")}>
                    <input ref={primeiroCampo} type="email" required autoComplete="email" inputMode="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                    <button disabled={ocupado} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60">
                      {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />} {cfg.codigo ? "Recibir código" : "Continuar"}
                    </button>
                  </form>
                  {cfg.codigo && (
                    <button onClick={() => { setErro(null); setEtapa("senha"); }} className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                      <KeyRound className="h-4 w-4" /> Entrar con contraseña
                    </button>
                  )}
                </>
              )}

              {etapa === "codigo" && (
                <form onSubmit={verificar} className="mt-5 space-y-3">
                  <input ref={primeiroCampo} required inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="000000" value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} className={cn(inputCls, "text-center font-mono text-2xl font-bold tracking-[0.5em]")} />
                  <button disabled={ocupado || codigo.length !== 6} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white hover:bg-primary/90 disabled:opacity-60">
                    {ocupado && <Loader2 className="h-5 w-5 animate-spin" />} Entrar
                  </button>
                  <p className="text-center text-sm text-zinc-500">
                    ¿No llegó? Revisá spam o{" "}
                    {reenviar > 0 ? <span>podés pedir otro en {Math.floor(reenviar / 60)}:{String(reenviar % 60).padStart(2, "0")}</span> : <button type="button" onClick={() => pedirCodigo()} className="font-semibold text-primary hover:underline">reenviar código</button>}
                  </p>
                </form>
              )}

              {etapa === "cadastro" && (
                <form onSubmit={cadastrar} className="mt-5 space-y-3">
                  <input ref={primeiroCampo} required autoComplete="name" placeholder="Nombre y apellido" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} className={inputCls} />
                  <select required value={dados.departamento} onChange={(e) => setDados({ ...dados, departamento: e.target.value })} className={cn(inputCls, "appearance-none", !dados.departamento && "text-zinc-400")}>
                    <option value="">Departamento</option>
                    {DEPARTAMENTOS_UY.map((d) => <option key={d} value={d} className="text-zinc-900">{d}</option>)}
                  </select>
                  <input autoComplete="tel" inputMode="tel" placeholder="Celular para ofertas por WhatsApp (opcional)" value={dados.telefone} onChange={(e) => setDados({ ...dados, telefone: mascararCelularUY(e.target.value) })} className={inputCls} />
                  <button disabled={ocupado} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white hover:bg-primary/90 disabled:opacity-60">
                    {ocupado && <Loader2 className="h-5 w-5 animate-spin" />} Crear cuenta y ver mi cupón
                  </button>
                  <p className="text-center text-xs leading-relaxed text-zinc-500">Al crear tu cuenta aceptás los términos y la <a href="/ayuda#privacidad" target="_blank" className="underline">política de privacidad</a>, y recibir ofertas por e-mail y WhatsApp. Podés darte de baja cuando quieras.</p>
                </form>
              )}

              {etapa === "senha" && (
                <form onSubmit={entrarComSenha} className="mt-5 space-y-3">
                  <input ref={!email ? primeiroCampo : undefined} type="email" required autoComplete="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                  <input ref={email ? primeiroCampo : undefined} type="password" required autoComplete="current-password" placeholder="Contraseña" value={senha} onChange={(e) => setSenha(e.target.value)} className={inputCls} />
                  <button disabled={ocupado} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white hover:bg-primary/90 disabled:opacity-60">
                    {ocupado && <Loader2 className="h-5 w-5 animate-spin" />} Entrar
                  </button>
                  <p className="text-center text-sm text-zinc-500">¿No tenés cuenta? <a href="/cadastro" className="font-semibold text-primary hover:underline">Creala acá</a></p>
                </form>
              )}

              {erro && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{erro}</p>}
              {etapa === "inicio" && (
                <button onClick={fechar} className="mt-4 w-full text-center text-xs text-zinc-400 hover:text-zinc-600">Ahora no, gracias</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
