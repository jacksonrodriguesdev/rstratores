import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Mail,
  MapPin,
  Lock,
  LogOut,
  BookOpen,
  ListChecks,
  MessageCircle,
  Loader2,
  ShieldCheck,
  Home,
  ChevronRight,
  Eye,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Campo, CampoCelular, CampoSenha, ForcaSenha, inputCls } from "@/components/auth/AuthShell";
import { getPerfilFn, salvarPerfilFn, trocarSenhaFn, type Perfil } from "@/lib/conta";
import { DEPARTAMENTOS_UY, mascararCelularUY, formatarCelularUY } from "@/lib/validacao-conta";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { tr, useT, type Idioma } from "@/lib/idioma";

export const Route = createFileRoute("/cuenta")({
  validateSearch: z.object({
    completar: z.coerce.number().optional(),
    redirect: z.string().optional(),
  }),
  loader: async () => {
    const perfil = await getPerfilFn();
    if (!perfil) throw redirect({ to: "/login", search: { redirect: "/cuenta" } as never });
    return perfil;
  },
  head: ({ match }) => ({
    meta: [
      {
        title: tr(
          (match.context?.idioma ?? "es") as Idioma,
          "Mi cuenta — AGRO PARTS",
          "Minha conta — AGRO PARTS",
        ),
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CuentaPage,
});

const ABAS = [
  { id: "datos", rotulo: ["Mis datos", "Meus dados"], icone: User },
  { id: "seguridad", rotulo: ["Seguridad", "Segurança"], icone: Lock },
  { id: "catalogos", rotulo: ["Mis catálogos", "Meus catálogos"], icone: BookOpen },
] as const;
type Aba = (typeof ABAS)[number]["id"];

function CuentaPage() {
  const perfil = Route.useLoaderData();
  const { completar, redirect: destino } = Route.useSearch();
  const [aba, setAba] = useState<Aba>("datos");
  const { t, href } = useT();
  const iniciais = (perfil.nome_completo.trim() || perfil.email)
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sair = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = href("/");
  };

  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-3 py-5 md:px-4 md:py-10">
        {/* Cabeçalho do perfil */}
        <section className="relative overflow-hidden rounded-3xl bg-[#06321b] p-5 text-white md:p-8">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]"
          />
          <div className="relative flex items-center gap-4">
            {perfil.avatar_url ? (
              <img
                src={perfil.avatar_url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/30 md:h-20 md:w-20"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-2xl font-extrabold text-[#06321b] md:h-20 md:w-20 md:text-3xl">
                {iniciais}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/70">{t("Hola,", "Olá,")}</p>
              <h1 className="truncate text-2xl font-extrabold md:text-3xl">
                {perfil.nome_completo.trim().split(" ")[0] || t("Mi cuenta", "Minha conta")}
              </h1>
              <p className="truncate text-sm text-white/70">{perfil.email}</p>
            </div>
            <button
              onClick={sair}
              className="hidden items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/20 md:flex"
            >
              <LogOut className="h-4 w-4" /> {t("Salir", "Sair")}
            </button>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2 md:mt-6 md:max-w-lg">
            {[
              { to: "/catalogos", icone: BookOpen, rotulo: "Catálogos" },
              {
                to: "/pedido-rapido",
                icone: ListChecks,
                rotulo: t("Pedido rápido", "Pedido rápido"),
              },
              {
                href: whatsappContactUrl(
                  t(
                    "¡Hola! Soy cliente de AGRO PARTS y quiero cotizar repuestos.",
                    "Olá! Sou cliente da AGRO PARTS e quero orçamento de peças.",
                  ),
                ),
                icone: MessageCircle,
                rotulo: "WhatsApp",
              },
            ].map((a) => {
              const conteudo = (
                <>
                  <a.icone className="h-5 w-5 text-amber-300" />
                  <span className="text-[13px] font-semibold">{a.rotulo}</span>
                </>
              );
              const cls =
                "flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 py-3 ring-1 ring-white/10 transition hover:bg-white/20 active:scale-95";
              return a.to ? (
                <Link key={a.rotulo} to={a.to} className={cls}>
                  {conteudo}
                </Link>
              ) : (
                <a
                  key={a.rotulo}
                  href={a.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cls}
                >
                  {conteudo}
                </a>
              );
            })}
          </div>
        </section>

        {perfil.cupom && !perfil.cupomUsado && (
          <a
            href={whatsappContactUrl(
              t(
                `¡Hola! Soy ${perfil.nome_completo.trim().split(" ")[0] || "cliente"} y quiero usar mi cupón ${perfil.cupom} en mi primera compra.`,
                `Olá! Sou ${perfil.nome_completo.trim().split(" ")[0] || "cliente"} e quero usar meu cupom ${perfil.cupom} na primeira compra.`,
              ),
            )}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-dashed border-[#e0a800] bg-[#fffbeb] p-4 transition hover:bg-[#fff6d6]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f2c94c] text-lg font-black text-[#06321b]">
              %
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-700">
                {t(
                  "Tu cupón de descuento en la primera compra",
                  "Seu cupom de desconto na primeira compra",
                )}
              </span>
              <span className="block font-mono text-2xl font-black tracking-[0.15em] text-primary">
                {perfil.cupom}
              </span>
            </span>
            <span className="hidden text-sm font-bold text-[#128C4B] sm:block">
              {t("Usarlo por WhatsApp →", "Usar pelo WhatsApp →")}
            </span>
          </a>
        )}

        {(completar || !perfil.telefone) && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <b>{t("Completá tu celular", "Complete seu celular")}</b>{" "}
              {t(
                "para que podamos responderte por WhatsApp con el precio de tus repuestos.",
                "para respondermos pelo WhatsApp com o preço das suas peças.",
              )}
            </p>
          </div>
        )}

        {/* Abas */}
        <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr] md:gap-6">
          <nav className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:flex-col md:px-0">
            {ABAS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition",
                  aba === a.id
                    ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                    : "text-zinc-600 hover:bg-white/60",
                )}
              >
                <a.icone className="h-4 w-4" /> {t(a.rotulo[0], a.rotulo[1])}
              </button>
            ))}
            <button
              onClick={sair}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 md:mt-4"
            >
              <LogOut className="h-4 w-4" /> {t("Cerrar sesión", "Sair da conta")}
            </button>
          </nav>
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
            {aba === "datos" && <Dados perfil={perfil} destino={completar ? destino : undefined} />}
            {aba === "seguridad" && <Seguranca perfil={perfil} />}
            {aba === "catalogos" && <MeusCatalogos perfil={perfil} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function Dados({ perfil, destino }: { perfil: Perfil; destino?: string }) {
  const { t, idioma } = useT();
  const pt = idioma === "pt";
  // Celular brasileiro (+55...) fica como está; o uruguaio ganha a máscara 9X XXX XXX
  const celularInicial = (perfil.telefone || "").startsWith("+55")
    ? perfil.telefone!
    : mascararCelularUY(perfil.telefone || "");
  const [f, setF] = useState({
    nome_completo: perfil.nome_completo,
    telefone: celularInicial,
    departamento: perfil.departamento || "",
    cidade: perfil.cidade || "",
    endereco: perfil.endereco || "",
    numero_casa: perfil.numero_casa || "",
    ponto_referencia: perfil.ponto_referencia || "",
    cep: perfil.cep || "",
  });
  const [recebe, setRecebe] = useState(perfil.recebe_emails);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await salvarPerfilFn({ data: { ...f, recebe_emails: recebe } });
      toast.success(t("Datos guardados", "Dados salvos"));
      if (destino) window.location.href = destino;
    } catch (err: any) {
      toast.error(
        pt
          ? "Não conseguimos salvar. Confira o celular com DDD, ex. (53) 99999-9999."
          : err?.message || "No pudimos guardar.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-zinc-900">{t("Mis datos", "Meus dados")}</h2>
        <p className="text-sm text-zinc-500">
          {t(
            "Los usamos para cotizar y enviarte los repuestos.",
            "Usamos para fazer o orçamento e enviar suas peças.",
          )}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="p-nome" label={t("Nombre completo", "Nome completo")} icone={User}>
          <input
            id="p-nome"
            value={f.nome_completo}
            onChange={(e) => set("nome_completo")(e.target.value)}
            className={inputCls()}
          />
        </Campo>
        <Campo
          id="p-email"
          label="E-mail"
          icone={Mail}
          dica={
            perfil.google
              ? t("Vinculado a tu cuenta de Google", "Vinculado à sua conta Google")
              : undefined
          }
        >
          <input
            id="p-email"
            value={perfil.email}
            disabled
            className={cn(inputCls(), "cursor-not-allowed opacity-70")}
          />
        </Campo>
        <Campo id="p-tel" label="Celular (WhatsApp)">
          {pt ? (
            <input
              id="p-tel"
              type="tel"
              inputMode="tel"
              placeholder="(53) 99999-9999"
              value={f.telefone}
              onChange={(e) => set("telefone")(e.target.value)}
              className={inputCls(false)}
            />
          ) : (
            <CampoCelular id="p-tel" value={f.telefone} onChange={set("telefone")} />
          )}
        </Campo>
        {!pt && (
          <Campo id="p-depto" label="Departamento" icone={MapPin}>
            <select
              id="p-depto"
              value={f.departamento}
              onChange={(e) => set("departamento")(e.target.value)}
              className={cn(inputCls(), "appearance-none")}
            >
              <option value="">Elegí…</option>
              {DEPARTAMENTOS_UY.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Campo>
        )}
      </div>
      <div className="border-t pt-5">
        <h3 className="flex items-center gap-2 font-bold text-zinc-900">
          <Home className="h-4 w-4 text-primary" /> {t("Dirección de envío", "Endereço de entrega")}
        </h3>
        <p className="text-sm text-zinc-500">
          {t(
            "Para despachar por DAC sin tener que pedírtela cada vez.",
            "Para enviar sem precisar pedir toda vez.",
          )}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <Campo id="p-cidade" label={t("Ciudad / localidad", "Cidade / estado")}>
            <input
              id="p-cidade"
              value={f.cidade}
              onChange={(e) => set("cidade")(e.target.value)}
              className={inputCls(false)}
            />
          </Campo>
        </div>
        <div className="sm:col-span-3">
          <Campo id="p-cep" label={t("Código postal", "CEP")}>
            <input
              id="p-cep"
              inputMode="numeric"
              value={f.cep}
              onChange={(e) => set("cep")(e.target.value)}
              className={inputCls(false)}
            />
          </Campo>
        </div>
        <div className="sm:col-span-4">
          <Campo id="p-end" label={t("Calle", "Rua")}>
            <input
              id="p-end"
              autoComplete="street-address"
              value={f.endereco}
              onChange={(e) => set("endereco")(e.target.value)}
              className={inputCls(false)}
            />
          </Campo>
        </div>
        <div className="sm:col-span-2">
          <Campo id="p-num" label={t("Número", "Número")}>
            <input
              id="p-num"
              value={f.numero_casa}
              onChange={(e) => set("numero_casa")(e.target.value)}
              className={inputCls(false)}
            />
          </Campo>
        </div>
        <div className="sm:col-span-6">
          <Campo
            id="p-ref"
            label={t("Referencia (opcional)", "Complemento / referência (opcional)")}
          >
            <input
              id="p-ref"
              placeholder={t(
                "Ej.: ruta 5 km 340, portón verde",
                "Ex.: BR-471 km 600, portão verde",
              )}
              value={f.ponto_referencia}
              onChange={(e) => set("ponto_referencia")(e.target.value)}
              className={inputCls(false)}
            />
          </Campo>
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={recebe}
          onChange={(e) => setRecebe(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
        />
        <span>
          <b className="text-zinc-900">
            {t("Recibir ofertas por e-mail", "Receber ofertas por e-mail")}
          </b>
          <br />
          {t(
            "Promociones del mes y novedades de repuestos. Podés darte de baja cuando quieras.",
            "Promoções do mês e novidades de peças. Você pode cancelar quando quiser.",
          )}
        </span>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}{" "}
        {t("Guardar cambios", "Salvar alterações")}
      </button>
    </form>
  );
}

function Seguranca({ perfil }: { perfil: Perfil }) {
  const { t } = useT();
  const [f, setF] = useState({ atual: "", nova: "", confirmar: "" });
  const [busy, setBusy] = useState(false);
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await trocarSenhaFn({ data: f });
      toast.success(
        perfil.temSenha
          ? t("Contraseña cambiada", "Senha alterada")
          : t("Contraseña creada", "Senha criada"),
      );
      setF({ atual: "", nova: "", confirmar: "" });
    } catch (err: any) {
      toast.error(
        err?.message || t("No pudimos cambiar la contraseña.", "Não conseguimos alterar a senha."),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={salvar} className="max-w-md space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-zinc-900">
          {perfil.temSenha
            ? t("Cambiar contraseña", "Alterar senha")
            : t("Crear una contraseña", "Criar uma senha")}
        </h2>
        <p className="text-sm text-zinc-500">
          {perfil.temSenha
            ? t(
                "Usá al menos 8 caracteres, con letras y números.",
                "Use pelo menos 8 caracteres, com letras e números.",
              )
            : t(
                "Tu cuenta se creó con Google. Si querés, creá una contraseña para ingresar también con tu e-mail.",
                "Sua conta foi criada sem senha. Se quiser, crie uma senha para entrar também com seu e-mail.",
              )}
        </p>
      </div>
      {perfil.google && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          <ShieldCheck className="h-4 w-4" />{" "}
          {t("Cuenta vinculada a Google", "Conta vinculada ao Google")}
        </div>
      )}
      {perfil.temSenha && (
        <Campo id="s-atual" label={t("Contraseña actual", "Senha atual")} icone={Lock}>
          <CampoSenha
            id="s-atual"
            autoComplete="current-password"
            value={f.atual}
            onChange={(e) => setF({ ...f, atual: e.target.value })}
          />
        </Campo>
      )}
      <Campo
        id="s-nova"
        label={t("Nueva contraseña", "Nova senha")}
        icone={Lock}
        dica={<ForcaSenha senha={f.nova} />}
      >
        <CampoSenha
          id="s-nova"
          autoComplete="new-password"
          value={f.nova}
          onChange={(e) => setF({ ...f, nova: e.target.value })}
        />
      </Campo>
      <Campo
        id="s-conf"
        label={t("Confirmá la nueva contraseña", "Confirme a nova senha")}
        icone={Lock}
        erro={
          f.confirmar && f.confirmar !== f.nova
            ? t("Las contraseñas no coinciden.", "As senhas não coincidem.")
            : null
        }
      >
        <CampoSenha
          id="s-conf"
          autoComplete="new-password"
          value={f.confirmar}
          onChange={(e) => setF({ ...f, confirmar: e.target.value })}
          invalido={!!f.confirmar && f.confirmar !== f.nova}
        />
      </Campo>
      <button
        type="submit"
        disabled={busy || !f.nova || f.nova !== f.confirmar}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}{" "}
        {perfil.temSenha
          ? t("Cambiar contraseña", "Alterar senha")
          : t("Crear contraseña", "Criar senha")}
      </button>
    </form>
  );
}

function MeusCatalogos({ perfil }: { perfil: Perfil }) {
  const { t, idioma, href } = useT();
  const local = idioma === "pt" ? "pt-BR" : "es-UY";
  return (
    <div>
      <h2 className="text-xl font-extrabold text-zinc-900">
        {t("Mis catálogos", "Meus catálogos")}
      </h2>
      <p className="text-sm text-zinc-500">
        {t("Los catálogos y manuales que abriste.", "Os catálogos e manuais que você abriu.")}
      </p>
      {perfil.downloads.length ? (
        <ul className="mt-4 divide-y">
          {perfil.downloads.map((d, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-xs font-extrabold text-red-600">
                PDF
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900">{d.titulo}</p>
                <p className="text-xs text-zinc-500">
                  {[d.marca, new Date(d.quando).toLocaleDateString(local)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <a
                href={href(`/catalogos/ver/${d.id}`)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-primary/10"
                aria-label={t("Ver de nuevo", "Ver de novo")}
              >
                <Eye className="h-5 w-5" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <Link
          to="/catalogos"
          className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-50 p-4 font-semibold text-zinc-800 ring-1 ring-black/5 hover:bg-zinc-100"
        >
          <span className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />{" "}
            {t("Ver catálogos para mecánicos", "Ver catálogos para mecânicos")}
          </span>
          <ChevronRight className="h-5 w-5 text-zinc-400" />
        </Link>
      )}
      <p className="mt-6 text-xs text-zinc-400">
        {t("Cliente desde", "Cliente desde")}{" "}
        {new Date(perfil.criado).toLocaleDateString(local, { month: "long", year: "numeric" })}
        {perfil.telefone
          ? ` · ${perfil.telefone.startsWith("+55") ? perfil.telefone : formatarCelularUY(perfil.telefone)}`
          : ""}
      </p>
    </div>
  );
}
