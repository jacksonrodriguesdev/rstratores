import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, MapPin, MessageCircle, Store, Share2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useT } from "@/lib/idioma";
import { getAnuncioFn, registrarLeadFn, tipoLabel } from "@/lib/marketplace";

const urlFoto = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);

export const Route = createFileRoute("/maquina/$id")({
  loader: async ({ params }) => {
    const a = await getAnuncioFn({ data: { id: Number(params.id) } });
    if (!a || a.status !== "ACTIVO") throw notFound();
    return a;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.titulo} | AGRO PARTS Marketplace` : "Máquina" },
      { name: "description", content: loaderData?.descricao?.slice(0, 160) ?? "" },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const a = Route.useLoaderData();
  const { idioma } = useT();
  const es = idioma !== "pt";
  const [foto, setFoto] = useState(0);

  useEffect(() => {
    registrarLeadFn({ data: { id: a.id, tipo: "view" } }).catch(() => {});
  }, [a.id]);

  const emp = a.empresaFull;
  const precoTxt =
    a.precoConsultar || a.preco == null
      ? es
        ? "Consultar precio"
        : "Consultar preço"
      : `${a.moeda === "USD" ? "US$" : "$U"} ${a.preco.toLocaleString("es-UY")}`;

  const waNum = (emp?.telefone_wa ?? "").replace(/\D/g, "");
  const waMsg = encodeURIComponent(
    es
      ? `¡Hola! Me interesa "${a.titulo}" (${precoTxt}) que vi en AGRO PARTS Marketplace.`
      : `Olá! Tenho interesse em "${a.titulo}" (${precoTxt}) que vi no AGRO PARTS Marketplace.`,
  );
  const waUrl = waNum ? `https://wa.me/${waNum}?text=${waMsg}` : null;

  const ficha: Array<[string, string | number | null]> = [
    [es ? "Marca" : "Marca", a.marca],
    [es ? "Modelo" : "Modelo", a.modelo],
    [es ? "Año" : "Ano", a.ano],
    [
      a.unidadeUso === "km" ? "Km" : es ? "Horas" : "Horas",
      a.horasKm ? a.horasKm.toLocaleString("es-UY") : null,
    ],
    [es ? "Potencia" : "Potência", a.potencia],
    [
      es ? "Estado" : "Estado",
      a.condicao === "NUEVO" ? (es ? "Nuevo" : "Novo") : es ? "Usado" : "Usado",
    ],
    [es ? "Tipo" : "Tipo", tipoLabel(a.tipo, es ? "es" : "pt")],
    [es ? "Ubicación" : "Local", a.departamento],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Link to="/marketplace" className="text-sm text-emerald-700 hover:underline">
          ← {es ? "Volver al marketplace" : "Voltar ao marketplace"}
        </Link>

        <div className="mt-3 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          {/* Galeria + ficha */}
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-xl border bg-slate-100">
              {a.fotos.length > 0 ? (
                <img
                  src={urlFoto(a.fotos[foto])}
                  alt={a.titulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  {es ? "Sin foto" : "Sem foto"}
                </div>
              )}
            </div>
            {a.fotos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {a.fotos.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setFoto(i)}
                    className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                      i === foto ? "border-emerald-600" : "border-transparent"
                    }`}
                  >
                    <img src={urlFoto(f)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <h1 className="mt-4 text-2xl font-extrabold text-slate-800">{a.titulo}</h1>
            <p className="mt-1 text-3xl font-extrabold text-emerald-700">{precoTxt}</p>

            <div className="mt-4 overflow-hidden rounded-xl border bg-white">
              <table className="w-full text-sm">
                <tbody>
                  {ficha
                    .filter(([, v]) => v != null && v !== "")
                    .map(([k, v]) => (
                      <tr key={k} className="border-b last:border-0">
                        <td className="w-1/3 bg-slate-50 px-3 py-2 font-semibold text-slate-600">
                          {k}
                        </td>
                        <td className="px-3 py-2 text-slate-800">{v}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {a.descricao && (
              <div className="mt-4">
                <h2 className="mb-1 font-bold text-slate-700">
                  {es ? "Descripción" : "Descrição"}
                </h2>
                <p className="whitespace-pre-line text-sm text-slate-700">{a.descricao}</p>
              </div>
            )}
          </div>

          {/* Vendedor */}
          <aside className="space-y-3">
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1 font-bold text-slate-800">
                    {emp?.nome}
                    {emp?.verificada && <BadgeCheck className="h-4 w-4 text-sky-500" />}
                  </div>
                  {emp && <div className="text-xs text-slate-500">@{emp.handle}</div>}
                </div>
              </div>
              {emp?.ubicacion && (
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" /> {emp.ubicacion}
                </p>
              )}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() =>
                    registrarLeadFn({ data: { id: a.id, tipo: "whatsapp" } }).catch(() => {})
                  }
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white"
                >
                  <MessageCircle className="h-4 w-4" />{" "}
                  {es ? "Contactar por WhatsApp" : "Contato por WhatsApp"}
                </a>
              )}
              {emp && (
                <Link
                  to="/m/$handle"
                  params={{ handle: emp.handle }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-emerald-600 px-4 py-2.5 text-sm font-bold text-emerald-700"
                >
                  <Store className="h-4 w-4" />{" "}
                  {es ? "Ver tienda del vendedor" : "Ver loja do vendedor"}
                </Link>
              )}
              <button
                onClick={() => {
                  if (navigator.share) navigator.share({ title: a.titulo, url: location.href });
                  else navigator.clipboard?.writeText(location.href);
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                <Share2 className="h-4 w-4" /> {es ? "Compartir" : "Compartilhar"}
              </button>
            </div>

            <div className="rounded-xl border bg-amber-50 p-3 text-xs text-amber-800">
              <p className="flex items-center gap-1 font-bold">
                <ShieldCheck className="h-4 w-4" /> {es ? "Comprá seguro" : "Compre com segurança"}
              </p>
              <p className="mt-1">
                {es
                  ? "Revisá la máquina antes de pagar. Nunca transfieras dinero sin ver el equipo."
                  : "Verifique a máquina antes de pagar. Nunca transfira dinheiro sem ver o equipamento."}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
