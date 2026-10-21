// Etiqueta da transportadora para imprimir (admin): logo no topo, destinatário em destaque,
// remetente, pedido e, no rodapé, o QR único da venda «Avalie e ganhe 15%».
// ?formato=10x15 (térmica, padrão) ou ?formato=a4 (impressora comum).
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { etiquetaFn } from "@/lib/avaliacoes";
import { nomeEs } from "@/lib/pecas-es";

type Busca = { formato?: "10x15" | "a4" };
export const Route = createFileRoute("/etiqueta/$id")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    formato: s.formato === "a4" ? "a4" : "10x15",
  }),
  head: () => ({
    meta: [{ title: "Etiqueta — AGRO PARTS" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Etiqueta,
});

const TXT = {
  es: {
    dest: "DESTINATARIO",
    rem: "REMITENTE",
    ped: "Pedido",
    transp: "Transportista",
    tel: "Tel.",
    doc: "Doc.",
    cta: (d: number) => `Calificá tu compra y ganá ${d}% de descuento en la próxima`,
    passo: "Escaneá el QR con la cámara del celular",
    obrigado: "¡Gracias por tu compra!",
    conteudo: "CONTENIDO",
    mais: (n: number) => `+ ${n} ítem(s) más`,
  },
  pt: {
    dest: "DESTINATÁRIO",
    rem: "REMETENTE",
    ped: "Pedido",
    transp: "Transportadora",
    tel: "Tel.",
    doc: "Doc.",
    cta: (d: number) => `Avalie sua compra e ganhe ${d}% de desconto na próxima`,
    passo: "Aponte a câmera do celular para o QR",
    obrigado: "Obrigado pela compra!",
    conteudo: "CONTEÚDO",
    mais: (n: number) => `+ ${n} item(ns)`,
  },
};

function Etiqueta() {
  const { id } = Route.useParams();
  const { formato } = Route.useSearch();
  const [d, setD] = useState<Awaited<ReturnType<typeof etiquetaFn>> | null>(null);
  const [erro, setErro] = useState("");
  const [qr, setQr] = useState("");
  useEffect(() => {
    etiquetaFn({ data: { id: Number(id) } })
      .then(setD)
      .catch((e) => setErro(e?.message ?? "Erro"));
  }, [id]);
  useEffect(() => {
    if (d?.link)
      QRCode.toDataURL(d.link, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 600,
        color: { dark: "#000000", light: "#ffffff" },
      }).then(setQr);
  }, [d?.link]);
  if (erro)
    return (
      <p style={{ padding: 24, fontFamily: "sans-serif" }}>
        {erro} — entre no painel como administrador.
      </p>
    );
  if (!d) return <p style={{ padding: 24, fontFamily: "sans-serif" }}>Carregando…</p>;
  const v = d.venda;
  const t = TXT[v.pais === "BR" ? "pt" : "es"];
  const a4 = formato === "a4";
  const W = a4 ? "190mm" : "100mm";
  const H = a4 ? "277mm" : "150mm";
  const k = a4 ? 1.75 : 1; // escala das letras no A4
  const px = (n: number) => `${(n * k).toFixed(1)}pt`;
  const pais = v.pais === "BR" ? "Brasil" : "Uruguay";
  return (
    <>
      <style>{`
        @page { size: ${a4 ? "A4" : "100mm 150mm"}; margin: ${a4 ? "10mm" : "0"}; }
        html, body { margin: 0; background: #e5e5e5; }
        @media print { html, body { background: #fff; } .nao-imprimir { display: none !important; } .folha { box-shadow: none !important; margin: 0 !important; } }
        .folha * { box-sizing: border-box; }
      `}</style>
      <div
        className="nao-imprimir"
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          padding: 12,
          fontFamily: "sans-serif",
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#111",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "10px 18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Printer size={16} /> Imprimir
        </button>
        <a
          href={`?formato=${a4 ? "10x15" : "a4"}`}
          style={{ padding: "10px 14px", color: "#111", fontWeight: 600 }}
        >
          Trocar para {a4 ? "10×15 cm (térmica)" : "A4 (impressora comum)"}
        </a>
      </div>
      <div
        className="folha"
        style={{
          width: W,
          height: H,
          margin: "0 auto 24px",
          background: "#fff",
          boxShadow: "0 4px 24px rgba(0,0,0,.15)",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#000",
          display: "flex",
          flexDirection: "column",
          padding: a4 ? "8mm" : "4mm",
          overflow: "hidden",
        }}
      >
        {/* Logo centralizada */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "2px solid #000",
            paddingBottom: a4 ? "4mm" : "2mm",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: a4 ? 12 : 6 }}>
            <img src="/logo.png" alt="" style={{ height: a4 ? "22mm" : "12mm", width: "auto" }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 900, fontSize: px(17), letterSpacing: 0.5, lineHeight: 1 }}>
                AGRO PARTS
              </div>
              <div style={{ fontSize: px(6.5), fontWeight: 700, letterSpacing: 1.5 }}>
                REPUESTOS · PEÇAS AGRÍCOLAS
              </div>
              <div style={{ fontSize: px(6.5) }}>agropartsuy.com</div>
            </div>
          </div>
        </div>

        {/* Destinatário */}
        <div
          style={{
            border: "2px solid #000",
            borderRadius: 4,
            padding: a4 ? "4mm" : "2.2mm",
            marginTop: a4 ? "4mm" : "2mm",
          }}
        >
          <div style={{ fontSize: px(7), fontWeight: 900, letterSpacing: 1 }}>{t.dest}</div>
          <div
            style={{
              fontSize: px(14),
              fontWeight: 900,
              lineHeight: 1.15,
              marginTop: 2,
              textTransform: "uppercase",
            }}
          >
            {v.cliente_nome}
          </div>
          {v.endereco && (
            <div style={{ fontSize: px(10), lineHeight: 1.25, marginTop: 2 }}>{v.endereco}</div>
          )}
          <div style={{ fontSize: px(10.5), fontWeight: 700, lineHeight: 1.25 }}>
            {[v.cidade, v.departamento].filter(Boolean).join(" — ")}
            {v.cep ? ` · ${v.pais === "BR" ? "CEP" : "CP"} ${v.cep}` : ""} · {pais}
          </div>
          <div style={{ fontSize: px(9), marginTop: 2 }}>
            {v.cliente_telefone && `${t.tel} ${v.cliente_telefone}`}
            {v.cliente_telefone && v.cliente_doc ? "   ·   " : ""}
            {v.cliente_doc && `${t.doc} ${v.cliente_doc}`}
          </div>
        </div>

        {/* Remetente + pedido */}
        <div style={{ display: "flex", gap: a4 ? "4mm" : "2mm", marginTop: a4 ? "3mm" : "1.6mm" }}>
          <div
            style={{
              flex: 1,
              border: "1px solid #000",
              borderRadius: 4,
              padding: a4 ? "3mm" : "1.6mm",
              fontSize: px(7.5),
              lineHeight: 1.3,
            }}
          >
            <div style={{ fontWeight: 900, letterSpacing: 1, fontSize: px(6.5) }}>{t.rem}</div>
            <div style={{ fontWeight: 700 }}>{d.remetente.nome}</div>
            {d.remetente.endereco && <div>{d.remetente.endereco}</div>}
            {d.remetente.cidade && <div>{d.remetente.cidade}</div>}
            {d.remetente.telefone && (
              <div>
                {t.tel} {d.remetente.telefone}
              </div>
            )}
            {d.remetente.doc && <div>{d.remetente.doc}</div>}
          </div>
          <div
            style={{
              width: a4 ? "55mm" : "30mm",
              border: "1px solid #000",
              borderRadius: 4,
              padding: a4 ? "3mm" : "1.6mm",
              fontSize: px(7.5),
              lineHeight: 1.3,
            }}
          >
            <div style={{ fontWeight: 900, letterSpacing: 1, fontSize: px(6.5) }}>
              {t.ped.toUpperCase()}
            </div>
            <div style={{ fontWeight: 900, fontSize: px(10), fontFamily: "monospace" }}>
              {v.codigo}
            </div>
            <div>
              {new Date(v.created_at).toLocaleDateString(v.pais === "BR" ? "pt-BR" : "es-UY")}
            </div>
            {v.transportadora && <div style={{ fontWeight: 700 }}>{v.transportadora}</div>}
            {v.rastreio && <div style={{ fontFamily: "monospace" }}>{v.rastreio}</div>}
          </div>
        </div>

        {/* Conteúdo do pacote (conferência na hora de embalar) */}
        <div
          style={{
            flex: 1,
            minHeight: 4,
            overflow: "hidden",
            marginTop: a4 ? "3mm" : "1.6mm",
            marginBottom: a4 ? "3mm" : "1.6mm",
            border: "1px dashed #000",
            borderRadius: 4,
            padding: a4 ? "3mm" : "1.6mm",
            fontSize: px(7.5),
            lineHeight: 1.35,
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 1, fontSize: px(6.5) }}>{t.conteudo}</div>
          {v.itens.slice(0, a4 ? 14 : 6).map((i: any) => (
            <div
              key={i.sku}
              style={{ display: "flex", gap: 4, whiteSpace: "nowrap", overflow: "hidden" }}
            >
              <b style={{ minWidth: a4 ? 34 : 18 }}>{i.qtd}×</b>
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{i.codigo}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {v.pais === "BR" ? i.nome : nomeEs(i.nome)}
              </span>
            </div>
          ))}
          {v.itens.length > (a4 ? 14 : 6) && <div>{t.mais(v.itens.length - (a4 ? 14 : 6))}</div>}
        </div>

        {/* Rodapé: QR para avaliar */}
        <div
          style={{
            background: "#000",
            color: "#fff",
            borderRadius: 6,
            padding: a4 ? "5mm" : "2.4mm",
            display: "flex",
            alignItems: "center",
            gap: a4 ? "5mm" : "2.4mm",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          {qr && (
            <img
              src={qr}
              alt="QR"
              style={{
                width: a4 ? "48mm" : "30mm",
                height: a4 ? "48mm" : "30mm",
                background: "#fff",
                borderRadius: 3,
                padding: a4 ? "1.5mm" : "0.8mm",
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: px(7), fontWeight: 700, color: "#f9c80e", letterSpacing: 1 }}>
              {t.obrigado.toUpperCase()}
            </div>
            <div style={{ fontSize: px(12.5), fontWeight: 900, lineHeight: 1.12, marginTop: 2 }}>
              {t.cta(d.desconto)}
            </div>
            <div style={{ fontSize: px(7), marginTop: a4 ? 6 : 3, color: "#ddd" }}>{t.passo}</div>
            <div style={{ fontSize: px(6.5), marginTop: 1, color: "#bbb", wordBreak: "break-all" }}>
              {d.link.replace("https://", "")}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
