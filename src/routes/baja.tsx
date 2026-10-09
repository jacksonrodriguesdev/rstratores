import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MailX, MailCheck, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { baixaEmailFn } from "@/lib/emails";

// Link "Darme de baja" dos e-mails. Pede confirmação (antivírus de e-mail abrem links sozinhos).
export const Route = createFileRoute("/baja")({
  validateSearch: z.object({ u: z.coerce.number().optional(), t: z.string().optional() }),
  head: () => ({ meta: [{ title: "Baja de e-mails — AGRO PARTS" }, { name: "robots", content: "noindex" }] }),
  component: Baja,
});

function Baja() {
  const { u, t } = Route.useSearch();
  const [estado, setEstado] = useState<"pergunta" | "saiu" | "voltou" | "erro">("pergunta");
  const [busy, setBusy] = useState(false);
  const agir = async (voltar: boolean) => {
    setBusy(true);
    try {
      const r = await baixaEmailFn({ data: { u: u ?? 0, t: t ?? "", voltar } });
      setEstado(r.ok ? (voltar ? "voltou" : "saiu") : "erro");
    } catch {
      setEstado("erro");
    } finally {
      setBusy(false);
    }
  };
  const Icone = estado === "voltou" ? MailCheck : MailX;
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-black/5">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icone className="h-7 w-7" /></span>
          {estado === "pergunta" && (
            <>
              <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">¿Dejar de recibir nuestros e-mails?</h1>
              <p className="mt-2 text-zinc-600">No te vamos a enviar más ofertas ni novedades por e-mail. Tu cuenta sigue activa.</p>
              <button onClick={() => agir(false)} disabled={busy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-60">
                {busy && <Loader2 className="h-5 w-5 animate-spin" />} Sí, darme de baja
              </button>
              <Link to="/" className="mt-3 block text-sm font-semibold text-zinc-500 hover:text-zinc-800">No, quiero seguir recibiendo</Link>
            </>
          )}
          {estado === "saiu" && (
            <>
              <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Listo, te diste de baja</h1>
              <p className="mt-2 text-zinc-600">No vas a recibir más e-mails de ofertas. ¿Fue un error?</p>
              <button onClick={() => agir(true)} disabled={busy} className="mt-5 h-11 w-full rounded-xl font-bold text-primary ring-1 ring-primary/30 hover:bg-primary/5">Volver a suscribirme</button>
            </>
          )}
          {estado === "voltou" && (
            <>
              <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">¡Bienvenido de nuevo!</h1>
              <p className="mt-2 text-zinc-600">Vas a seguir recibiendo nuestras ofertas.</p>
              <Link to="/" className="mt-5 flex h-11 items-center justify-center rounded-xl bg-primary font-bold text-white">Ir a la tienda</Link>
            </>
          )}
          {estado === "erro" && (
            <>
              <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Enlace no válido</h1>
              <p className="mt-2 text-zinc-600">Usá el enlace del último e-mail que recibiste o escribinos por WhatsApp.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
