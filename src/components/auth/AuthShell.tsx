import { useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Check, MessageCircle, BookOpen, Truck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { avaliarSenha, mascararCelularUY } from "@/lib/validacao-conta";

// Moldura das telas de conta (login e cadastro). No celular: topo verde compacto e o
// formulário ocupando a tela. No computador: painel da marca à esquerda e formulário à direita.
export function AuthShell({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#f3f5f1] lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca (computador) */}
      <aside className="relative hidden overflow-hidden bg-[#06321b] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]" />
        <div aria-hidden className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-3">
          <span className="rounded-2xl bg-white p-1.5"><img src="/logo.png" alt="" width={52} height={52} className="h-[52px] w-[52px]" /></span>
          <span>
            <span className="block text-2xl font-extrabold">AGRO PARTS</span>
            <span className="block text-xs font-bold tracking-[0.25em] text-amber-300">REPUESTOS AGRÍCOLAS</span>
          </span>
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">Tu cuenta para cotizar más rápido</h2>
          <ul className="mt-8 space-y-5">
            {[
              [MessageCircle, "Cotizaciones por WhatsApp con tus datos ya cargados"],
              [BookOpen, "Catálogos y manuales en PDF para mecánicos"],
              [Truck, "Tu dirección guardada para envíos por DAC"],
              [ShieldCheck, "Tus datos protegidos. Nunca compartimos tu información"],
            ].map(([Icone, texto]: any) => (
              <li key={texto} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"><Icone className="h-5 w-5 text-amber-300" /></span>
                <span className="pt-2 text-[17px] text-white/90">{texto}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/50">© {new Date().getFullYear()} AGRO PARTS · Envíos a todo Uruguay</p>
      </aside>

      {/* Formulário */}
      <main className="flex min-h-[100dvh] flex-col">
        <div className="bg-[#06321b] px-4 pb-14 pt-safe text-white lg:hidden">
          <div className="flex items-center justify-between py-3">
            <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-white/85"><ArrowLeft className="h-4 w-4" /> Tienda</Link>
            <img src="/logo.png" alt="AGRO PARTS" width={40} height={40} className="h-10 w-10 rounded-xl bg-white p-1" />
          </div>
          <h1 className="mt-3 text-[28px] font-extrabold leading-tight">{titulo}</h1>
          <p className="mt-1 text-white/75">{subtitulo}</p>
        </div>
        <div className="-mt-8 flex flex-1 justify-center px-4 pb-28 lg:mt-0 lg:items-center lg:px-10 lg:py-12">
          <div className="w-full max-w-[440px] rounded-3xl bg-white p-6 shadow-[0_20px_60px_-20px_rgba(6,50,27,0.25)] ring-1 ring-black/5 sm:p-8">
            <div className="mb-6 hidden lg:block">
              <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-primary"><ArrowLeft className="h-4 w-4" /> Volver a la tienda</Link>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">{titulo}</h1>
              <p className="mt-1.5 text-zinc-500">{subtitulo}</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function Campo({ id, label, icone: Icone, erro, dica, children }: { id: string; label: string; icone?: any; erro?: string | null; dica?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-zinc-700">{label}</label>
      <div className="relative">
        {Icone && <Icone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />}
        {children}
      </div>
      {erro ? <p className="mt-1.5 text-[13px] font-medium text-red-600">{erro}</p> : dica ? <div className="mt-1.5 text-[13px] text-zinc-500">{dica}</div> : null}
    </div>
  );
}

export const inputCls = (comIcone = true, invalido = false) =>
  cn(
    "h-12 w-full rounded-xl border bg-zinc-50/60 pr-4 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-4",
    comIcone ? "pl-11" : "pl-4",
    invalido ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-zinc-200 focus:border-primary focus:ring-primary/15",
  );

// Senha com o "olho" para mostrar/esconder
export function CampoSenha(props: InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean }) {
  const [ver, setVer] = useState(false);
  const { invalido, className, ...resto } = props;
  return (
    <>
      <input {...resto} type={ver ? "text" : "password"} className={cn(inputCls(true, invalido), "pr-12", className)} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={ver}
        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
      >
        {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </>
  );
}

// Celular uruguaio: prefixo +598 fixo e máscara 9X XXX XXX
export function CampoCelular({ value, onChange, id, invalido }: { value: string; onChange: (v: string) => void; id: string; invalido?: boolean }) {
  return (
    <div className={cn("flex h-12 overflow-hidden rounded-xl border bg-zinc-50/60 transition focus-within:bg-white focus-within:ring-4", invalido ? "border-red-300 focus-within:ring-red-100" : "border-zinc-200 focus-within:border-primary focus-within:ring-primary/15")}>
      <span className="flex items-center gap-1.5 border-r border-zinc-200 bg-zinc-100/70 px-3 text-sm font-semibold text-zinc-600">
        <svg viewBox="0 0 27 18" className="h-3.5 w-5 rounded-[2px]" aria-hidden><rect width="27" height="18" fill="#fff" />{[2, 6, 10, 14].map((y) => <rect key={y} y={y} width="27" height="2" fill="#0038A8" />)}<rect width="10" height="10" fill="#fff" /><circle cx="5" cy="5" r="3" fill="#FCD116" /></svg>
        +598
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="9X XXX XXX"
        value={value}
        onChange={(e) => onChange(mascararCelularUY(e.target.value))}
        className="min-w-0 flex-1 bg-transparent px-3 text-base tracking-wide text-zinc-900 outline-none placeholder:text-zinc-400"
      />
    </div>
  );
}

export function ForcaSenha({ senha }: { senha: string }) {
  if (!senha) return null;
  const { nivel, regras } = avaliarSenha(senha);
  const cores = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-lime-500", "bg-emerald-600"];
  const nomes = ["Muy débil", "Débil", "Aceptable", "Buena", "Excelente"];
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition", i < nivel ? cores[nivel] : "bg-zinc-200")} />)}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        <span className="font-semibold text-zinc-700">{nomes[nivel]}</span>
        {regras.map((r) => (
          <span key={r.texto} className={cn("inline-flex items-center gap-1", r.ok ? "text-emerald-700" : "text-zinc-400")}><Check className="h-3 w-3" />{r.texto}</span>
        ))}
      </div>
    </div>
  );
}

export function BotaoGoogle({ redirect, texto = "Continuar con Google" }: { redirect: string; texto?: string }) {
  return (
    <a
      href={`/api/auth/google?redirect=${encodeURIComponent(redirect)}`}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white text-[15px] font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.99]"
    >
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {texto}
    </a>
  );
}

export const Separador = () => (
  <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
    <span className="h-px flex-1 bg-zinc-200" />o<span className="h-px flex-1 bg-zinc-200" />
  </div>
);
