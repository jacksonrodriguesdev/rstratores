import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, CheckCircle2, Loader2, MapPin, MessageCircle, PackageCheck, Send, Truck, User, Wrench, X } from "lucide-react";
import { Campo, CampoCelular, inputCls } from "@/components/auth/AuthShell";
import { Reveal } from "@/components/home/Reveal";
import { BandeiraUruguay } from "@/components/Bandeiras";
import { DEPARTAMENTOS_UY, normalizarCelularUY, formatarCelularUY } from "@/lib/validacao-conta";
import { MONTADORAS } from "@/lib/navegacao";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { registrarEvento } from "@/lib/eventos";
import { getSessionFn } from "@/lib/user-auth";
import { cn } from "@/lib/utils";

// Cotação com a AGRO PARTS (distribuidora de repuestos agrícolas no Uruguai).
// Vai para Admin → Cotações (tabela quotes, mesma rota do "Mejoramos tu presupuesto").

export const VANTAGENS = [
  { icon: PackageCheck, titulo: "Amplio catálogo", texto: "Repuestos para tractores y cosechadoras de todas las marcas." },
  { icon: Truck, titulo: "Envíos a todo Uruguay", texto: "Por DAC, a los 19 departamentos, con seguimiento." },
  { icon: Wrench, titulo: "La pieza correcta", texto: "Confirmamos la compatibilidad antes de enviar." },
  { icon: MessageCircle, titulo: "Respuesta por WhatsApp", texto: "Te pasamos precio y disponibilidad." },
];

export function CotizacionForm({ compacto = false }: { compacto?: boolean }) {
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const [f, setF] = useState({ nome: "", telefone: "", departamento: "", marca: "", modelo: "", pecas: "" });
  const [foto, setFoto] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const arq = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const nome = f.nome || sessao?.nome || "";

  const resumo = () =>
    [f.marca && `Tractor: ${f.marca}${f.modelo ? ` ${f.modelo}` : ""}`, f.pecas && `Repuestos:\n${f.pecas}`].filter(Boolean).join("\n\n");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const tel = normalizarCelularUY(f.telefone);
    if (nome.trim().length < 3) return setErro("Escribí tu nombre.");
    if (!tel) return setErro("Celular uruguayo: 9 dígitos, empieza con 09.");
    if (!f.departamento) return setErro("Elegí tu departamento.");
    if (f.pecas.trim().length < 3 && !foto) return setErro("Contanos qué repuestos necesitás o mandá una foto de la pieza.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("nome", nome.trim());
      fd.append("whatsapp", formatarCelularUY(tel));
      fd.append("endereco", f.departamento);
      fd.append("mensagem", `[Cotización del sitio]\n${resumo()}`.trim());
      if (foto) fd.append("file", foto);
      const r = await fetch("/api/public/quotes", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No pudimos enviar la cotización.");
      registrarEvento("cotacao", `formulario|${f.marca || "-"}`);
      setOk(true);
    } catch (err: any) {
      setErro(err?.message || "Sin conexión. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  if (ok) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white p-8 text-center text-zinc-900 shadow-xl ring-1 ring-black/5">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h3 className="mt-4 text-2xl font-extrabold">¡Recibimos tu cotización!</h3>
        <p className="mt-2 max-w-sm text-zinc-600">Te escribimos por WhatsApp con el precio y la disponibilidad. Si es urgente, mandanos un mensaje ahora:</p>
        <a
          href={whatsappContactUrl(`¡Hola! Soy ${nome.trim()} (${f.departamento}). Acabo de pedir una cotización en el sitio.\n\n${resumo()}`)}
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => registrarEvento("whatsapp", "cotizacion-enviada")}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-6 font-bold text-white"
        >
          <MessageCircle className="h-5 w-5" /> Escribir por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-3xl bg-white p-5 text-zinc-900 shadow-xl ring-1 ring-black/5 md:p-7">
      <div>
        <h3 className="text-xl font-extrabold md:text-2xl">Pedí tu cotización</h3>
        <p className="text-sm text-zinc-500">Gratis y sin compromiso. Te respondemos por WhatsApp.</p>
      </div>
      <div className={cn("grid gap-4", !compacto && "sm:grid-cols-2")}>
        <Campo id="c-nome" label="Nombre" icone={User}>
          <input id="c-nome" autoComplete="name" placeholder="Juan Pérez" value={nome} onChange={(e) => set("nome")(e.target.value)} className={inputCls(true)} />
        </Campo>
        <Campo id="c-tel" label="Celular (WhatsApp)">
          <CampoCelular id="c-tel" value={f.telefone} onChange={set("telefone")} />
        </Campo>
      </div>
      <Campo id="c-depto" label="Departamento" icone={MapPin}>
        <select id="c-depto" value={f.departamento} onChange={(e) => set("departamento")(e.target.value)} className={cn(inputCls(true), "appearance-none")}>
          <option value="">Elegí…</option>
          {DEPARTAMENTOS_UY.map((d) => <option key={d}>{d}</option>)}
        </select>
      </Campo>
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-zinc-800">Marca del tractor o cosechadora</span>
        <div className="flex flex-wrap gap-2">
          {[...MONTADORAS, "Otra"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set("marca")(f.marca === m ? "" : m)}
              className={cn("rounded-full border px-3.5 py-2 text-sm font-semibold transition", f.marca === m ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-primary/50")}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <Campo id="c-modelo" label="Modelo y año (opcional)">
        <input id="c-modelo" placeholder="Ej.: MF 4275, 2012" value={f.modelo} onChange={(e) => set("modelo")(e.target.value)} className={inputCls(false)} />
      </Campo>
      <Campo id="c-pecas" label="¿Qué repuestos necesitás?" dica="Código original, nombre de la pieza o una descripción. Uno por línea.">
        <textarea id="c-pecas" rows={4} placeholder={"Ej.:\n2x Filtro de aceite 3136019\nRetén del eje delantero"} value={f.pecas} onChange={(e) => set("pecas")(e.target.value)} className={cn(inputCls(false), "h-auto py-3")} />
      </Campo>
      <input ref={arq} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
      {foto ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Camera className="h-5 w-5" /> <span className="min-w-0 flex-1 truncate">{foto.name}</span>
          <button type="button" onClick={() => { setFoto(null); if (arq.current) arq.current.value = ""; }} aria-label="Quitar foto"><X className="h-5 w-5" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => arq.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-3.5 text-sm font-semibold text-zinc-600 hover:border-primary hover:text-primary">
          <Camera className="h-5 w-5" /> Agregar foto de la pieza (opcional)
        </button>
      )}
      {erro && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{erro}</p>}
      <button type="submit" disabled={busy} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} {busy ? "Enviando…" : "Enviar cotización"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        ¿Muchos códigos? Usá el <Link to="/pedido-rapido" className="font-semibold text-primary underline">pedido rápido</Link>.
      </p>
    </form>
  );
}

// Seção da home: "Somos distribuidores de repuestos en Uruguay"
export function CotizacionDistribuidorBlock() {
  return (
    <Reveal>
      <section id="cotizar" className="relative scroll-mt-[calc(var(--altura-header,112px)+12px)] overflow-hidden rounded-2xl bg-[#06321b] text-white shadow-sm" aria-labelledby="cotizar-titulo">
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]" />
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative grid gap-6 p-5 md:grid-cols-[1fr_1.05fr] md:gap-10 md:p-10">
          <div className="md:pt-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold ring-1 ring-white/15">
              <BandeiraUruguay className="h-3.5 w-5 rounded-sm" /> Distribuidores en Uruguay
            </span>
            <h2 id="cotizar-titulo" className="mt-4 text-3xl font-extrabold leading-tight md:text-[2.6rem] md:leading-[1.08]">
              Somos distribuidores de repuestos agrícolas en Uruguay
            </h2>
            <p className="mt-3 text-lg font-bold text-amber-300 md:text-xl">Hacé tu cotización con nosotros.</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              {VANTAGENS.map((v) => (
                <li key={v.titulo} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><v.icon className="h-5 w-5 text-emerald-300" /></span>
                  <div>
                    <p className="font-bold">{v.titulo}</p>
                    <p className="text-sm text-white/70">{v.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <CotizacionForm compacto />
        </div>
      </section>
    </Reveal>
  );
}
