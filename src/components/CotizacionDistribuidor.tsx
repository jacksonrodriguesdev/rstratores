import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  PackageCheck,
  Send,
  Truck,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Campo, CampoCelular, inputCls } from "@/components/auth/AuthShell";
import { Reveal } from "@/components/home/Reveal";
import { BandeiraUruguay, BandeiraBrasil } from "@/components/Bandeiras";
import { useT } from "@/lib/idioma";
import { DEPARTAMENTOS_UY, normalizarCelularUY, formatarCelularUY } from "@/lib/validacao-conta";
import { MONTADORAS } from "@/lib/navegacao";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { registrarEvento } from "@/lib/eventos";
import { getSessionFn } from "@/lib/user-auth";
import { pedirCadastro } from "@/lib/pedir-cadastro";
import { cn } from "@/lib/utils";

// Cotação com a AGRO PARTS (distribuidora de repuestos agrícolas no Uruguai).
// Vai para Admin → Cotações (tabela quotes, mesma rota do "Mejoramos tu presupuesto").

export const VANTAGENS = [
  {
    icon: PackageCheck,
    titulo: "Amplio catálogo",
    texto: "Repuestos para tractores y cosechadoras de todas las marcas.",
  },
  {
    icon: Truck,
    titulo: "Envíos a todo Uruguay",
    texto: "Por DAC, a los 19 departamentos, con seguimiento.",
  },
  {
    icon: Wrench,
    titulo: "La pieza correcta",
    texto: "Confirmamos la compatibilidad antes de enviar.",
  },
  {
    icon: MessageCircle,
    titulo: "Respuesta por WhatsApp",
    texto: "Te pasamos precio y disponibilidad.",
  },
];

// Versão em português (cliente do Brasil)
export const VANTAGENS_PT = [
  {
    icon: PackageCheck,
    titulo: "Catálogo amplo",
    texto: "Peças para tratores e colheitadeiras de todas as marcas.",
  },
  {
    icon: Truck,
    titulo: "Envio para todo o Sul do Brasil",
    texto: "Por Correios ou transportadora, com nota fiscal e rastreio.",
  },
  { icon: Wrench, titulo: "A peça certa", texto: "Confirmamos a compatibilidade antes de enviar." },
  {
    icon: MessageCircle,
    titulo: "Resposta pelo WhatsApp",
    texto: "Passamos preço, disponibilidade e frete.",
  },
];

// Celular brasileiro com DDD: 10 ou 11 dígitos (com ou sem o 55)
const celularBR = (v: string) => {
  const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length === 10 || d.length === 11
    ? `+55 (${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}`
    : null;
};

export function CotizacionForm({ compacto = false }: { compacto?: boolean }) {
  const { t, idioma } = useT();
  const pt = idioma === "pt";
  const { data: sessao } = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const [f, setF] = useState({
    nome: "",
    telefone: "",
    departamento: "",
    marca: "",
    modelo: "",
    pecas: "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const arq = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const nome = f.nome || sessao?.nome || "";

  const resumo = () =>
    [
      f.marca && `${t("Tractor", "Trator")}: ${f.marca}${f.modelo ? ` ${f.modelo}` : ""}`,
      f.pecas && `${t("Repuestos", "Peças")}:\n${f.pecas}`,
    ]
      .filter(Boolean)
      .join("\n\n");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    // Cotação exige conta: sem login, abre o cadastro (depois é só enviar de novo)
    if (!sessao) {
      pedirCadastro({ motivo: "cotizacao" });
      return;
    }
    const tel = pt ? celularBR(f.telefone) : normalizarCelularUY(f.telefone);
    if (nome.trim().length < 3) return setErro(t("Escribí tu nombre.", "Digite seu nome."));
    if (!tel)
      return setErro(
        t("Celular uruguayo: 9 dígitos, empieza con 09.", "Celular com DDD: ex. (53) 99999-9999."),
      );
    if (!f.departamento.trim())
      return setErro(t("Elegí tu departamento.", "Informe sua cidade e estado."));
    if (f.pecas.trim().length < 3 && !foto)
      return setErro(
        t(
          "Contanos qué repuestos necesitás o mandá una foto de la pieza.",
          "Conte quais peças você precisa ou mande uma foto da peça.",
        ),
      );
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("nome", nome.trim());
      fd.append("whatsapp", pt ? tel : formatarCelularUY(tel));
      fd.append("endereco", pt ? `${f.departamento.trim()} (Brasil)` : f.departamento);
      fd.append(
        "mensagem",
        `${pt ? "[Orçamento do site — cliente do Brasil]" : "[Cotización del sitio]"}\n${resumo()}`.trim(),
      );
      if (foto) fd.append("file", foto);
      const r = await fetch("/api/public/quotes", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(
          pt
            ? "Não conseguimos enviar o orçamento. Tente de novo."
            : j.error || "No pudimos enviar la cotización.",
        );
      registrarEvento("cotacao", `formulario|${f.marca || "-"}`);
      setOk(true);
    } catch (err: any) {
      setErro(err?.message || t("Sin conexión. Probá de nuevo.", "Sem conexão. Tente de novo."));
    } finally {
      setBusy(false);
    }
  };

  if (ok) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white p-8 text-center text-zinc-900 shadow-xl ring-1 ring-black/5">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h3 className="mt-4 text-2xl font-extrabold">
          {t("¡Recibimos tu cotización!", "Recebemos seu pedido de orçamento!")}
        </h3>
        <p className="mt-2 max-w-sm text-zinc-600">
          {t(
            "Te escribimos por WhatsApp con el precio y la disponibilidad. Si es urgente, mandanos un mensaje ahora:",
            "Vamos responder pelo WhatsApp com preço, disponibilidade e frete. Se for urgente, mande uma mensagem agora:",
          )}
        </p>
        <a
          href={whatsappContactUrl(
            t(
              `¡Hola! Soy ${nome.trim()} (${f.departamento}). Acabo de pedir una cotización en el sitio.\n\n${resumo()}`,
              `Olá! Sou ${nome.trim()} (${f.departamento}, Brasil). Acabei de pedir um orçamento no site.\n\n${resumo()}`,
            ),
          )}
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => registrarEvento("whatsapp", "cotizacion-enviada")}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-6 font-bold text-white"
        >
          <MessageCircle className="h-5 w-5" />{" "}
          {t("Escribir por WhatsApp", "Escrever pelo WhatsApp")}
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="space-y-4 rounded-3xl bg-white p-5 text-zinc-900 shadow-xl ring-1 ring-black/5 md:p-7"
    >
      <div>
        <h3 className="text-xl font-extrabold md:text-2xl">
          {t("Pedí tu cotización", "Peça seu orçamento")}
        </h3>
        <p className="text-sm text-zinc-500">
          {t(
            "Gratis y sin compromiso. Te respondemos por WhatsApp.",
            "Grátis e sem compromisso. Respondemos pelo WhatsApp.",
          )}
        </p>
      </div>
      <div className={cn("grid gap-4", !compacto && "sm:grid-cols-2")}>
        <Campo id="c-nome" label={t("Nombre", "Nome")} icone={User}>
          <input
            id="c-nome"
            autoComplete="name"
            placeholder={t("Juan Pérez", "João da Silva")}
            value={nome}
            onChange={(e) => set("nome")(e.target.value)}
            className={inputCls(true)}
          />
        </Campo>
        <Campo id="c-tel" label="Celular (WhatsApp)">
          {pt ? (
            <input
              id="c-tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(53) 99999-9999"
              value={f.telefone}
              onChange={(e) => set("telefone")(e.target.value)}
              className={inputCls(false)}
            />
          ) : (
            <CampoCelular id="c-tel" value={f.telefone} onChange={set("telefone")} />
          )}
        </Campo>
      </div>
      <Campo id="c-depto" label={t("Departamento", "Cidade e estado")} icone={MapPin}>
        {pt ? (
          <input
            id="c-depto"
            autoComplete="address-level2"
            placeholder="Ex.: Santa Vitória do Palmar, RS"
            value={f.departamento}
            onChange={(e) => set("departamento")(e.target.value)}
            className={inputCls(true)}
          />
        ) : (
          <select
            id="c-depto"
            value={f.departamento}
            onChange={(e) => set("departamento")(e.target.value)}
            className={cn(inputCls(true), "appearance-none")}
          >
            <option value="">Elegí…</option>
            {DEPARTAMENTOS_UY.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        )}
      </Campo>
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-zinc-800">
          {t("Marca del tractor o cosechadora", "Marca do trator ou colheitadeira")}
        </span>
        <div className="flex flex-wrap gap-2">
          {[...MONTADORAS, t("Otra", "Outra")].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set("marca")(f.marca === m ? "" : m)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                f.marca === m
                  ? "border-primary bg-primary text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-primary/50",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <Campo id="c-modelo" label={t("Modelo y año (opcional)", "Modelo e ano (opcional)")}>
        <input
          id="c-modelo"
          placeholder={t("Ej.: MF 4275, 2012", "Ex.: MF 4275, 2012")}
          value={f.modelo}
          onChange={(e) => set("modelo")(e.target.value)}
          className={inputCls(false)}
        />
      </Campo>
      <Campo
        id="c-pecas"
        label={t("¿Qué repuestos necesitás?", "Quais peças você precisa?")}
        dica={t(
          "Código original, nombre de la pieza o una descripción. Uno por línea.",
          "Código original, nome da peça ou uma descrição. Uma por linha.",
        )}
      >
        <textarea
          id="c-pecas"
          rows={4}
          placeholder={t(
            "Ej.:\n2x Filtro de aceite 3136019\nRetén del eje delantero",
            "Ex.:\n2x Filtro de óleo 3136019\nRetentor do eixo dianteiro",
          )}
          value={f.pecas}
          onChange={(e) => set("pecas")(e.target.value)}
          className={cn(inputCls(false), "h-auto py-3")}
        />
      </Campo>
      <input
        ref={arq}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
      />
      {foto ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Camera className="h-5 w-5" />{" "}
          <span className="min-w-0 flex-1 truncate">{foto.name}</span>
          <button
            type="button"
            onClick={() => {
              setFoto(null);
              if (arq.current) arq.current.value = "";
            }}
            aria-label={t("Quitar foto", "Remover foto")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => arq.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-3.5 text-sm font-semibold text-zinc-600 hover:border-primary hover:text-primary"
        >
          <Camera className="h-5 w-5" />{" "}
          {t("Agregar foto de la pieza (opcional)", "Adicionar foto da peça (opcional)")}
        </button>
      )}
      {erro && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100"
        >
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}{" "}
        {busy ? t("Enviando…", "Enviando…") : t("Enviar cotización", "Enviar pedido de orçamento")}
      </button>
      <p className="text-center text-xs text-zinc-500">
        {t("¿Muchos códigos? Usá el", "Muitos códigos? Use o")}{" "}
        <Link to="/pedido-rapido" className="font-semibold text-primary underline">
          {t("pedido rápido", "pedido rápido")}
        </Link>
        .
      </p>
    </form>
  );
}

// Seção da home: "Somos distribuidores de repuestos en Uruguay"
export function CotizacionDistribuidorBlock() {
  const { t, idioma } = useT();
  const pt = idioma === "pt";
  return (
    <Reveal>
      <section
        id="cotizar"
        className="relative scroll-mt-[calc(var(--altura-header,112px)+12px)] overflow-hidden rounded-2xl bg-[#06321b] text-white shadow-sm"
        aria-labelledby="cotizar-titulo"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div className="relative grid gap-6 p-5 md:grid-cols-[1fr_1.05fr] md:gap-10 md:p-10">
          <div className="md:pt-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold ring-1 ring-white/15">
              {pt ? (
                <BandeiraBrasil className="h-3.5 w-5 rounded-sm" />
              ) : (
                <BandeiraUruguay className="h-3.5 w-5 rounded-sm" />
              )}{" "}
              {t("Distribuidores en Uruguay", "Atendemos RS, SC e PR")}
            </span>
            <h2
              id="cotizar-titulo"
              className="mt-4 text-3xl font-extrabold leading-tight md:text-[2.6rem] md:leading-[1.08]"
            >
              {t(
                "Somos distribuidores de repuestos agrícolas en Uruguay",
                "Peças agrícolas com envio para todo o Sul do Brasil",
              )}
            </h2>
            <p className="mt-3 text-lg font-bold text-amber-300 md:text-xl">
              {t("Hacé tu cotización con nosotros.", "Peça seu orçamento com a gente.")}
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              {(pt ? VANTAGENS_PT : VANTAGENS).map((v) => (
                <li key={v.titulo} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <v.icon className="h-5 w-5 text-emerald-300" />
                  </span>
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
