// Importar campanha pronta: um ZIP com as artes + pacote.json (legendas, tipo, idioma, ordem).
// O navegador lê o ZIP, envia cada imagem e agenda: a cada horário sai 1 post (fila "feed") e
// 1 story (fila "story"), na ordem do pacote (que já alterna espanhol e português).
// Retomável: o que já foi agendado fica anotado no navegador e não é repetido.
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileArchive,
  Loader2,
  RotateCcw,
  StopCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apagarPostsSemImagemFn, salvarPostFn, verificarPostsFn } from "@/lib/instagram";
import { cn } from "@/lib/utils";
import { Campo, enviarBlob } from "./comum";

type ItemPacote = {
  arquivo: string;
  tipo: "FEED" | "STORY";
  fila: "feed" | "story";
  idioma: "es" | "pt";
  legenda: string;
  comentario: string;
  titulo?: string;
};
type Pacote = { nome: string; itens: ItemPacote[] };

const HORAS_PADRAO = [8, 10, 12, 14, 16, 18, 20, 22];
// Horários a partir de "inicio": cada dia, nas horas escolhidas
export function horariosDesde(inicio: Date, horas: number[], n: number) {
  const hs = [...new Set(horas)].sort((a, b) => a - b);
  const out: Date[] = [];
  const d0 = new Date(inicio);
  d0.setHours(0, 0, 0, 0);
  for (let dia = 0; out.length < n && dia < 400; dia++)
    for (const h of hs) {
      const t = new Date(d0);
      t.setDate(d0.getDate() + dia);
      t.setHours(h, 0, 0, 0);
      if (t.getTime() >= inicio.getTime() && out.length < n) out.push(t);
    }
  return out;
}
// Próximo horário da lista (com 10 min de folga para a importação terminar)
function proximoHorario(horas: number[]) {
  const agora = new Date(Date.now() + 10 * 60_000);
  return horariosDesde(agora, horas, 1)[0] ?? agora;
}
const paraInputLocal = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

async function paraJpg(b: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(b);
  const k = Math.min(1, 1440 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, erro) =>
    c.toBlob((x) => (x ? ok(x) : erro(new Error("Falha ao converter"))), "image/jpeg", 0.9),
  );
}
const chaveFeitos = (nome: string) => `estudio_import_${nome}`;
function lerFeitos(nome: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(chaveFeitos(nome)) || "{}");
  } catch {
    return {};
  }
}

export function Importar() {
  const qc = useQueryClient();
  const [zip, setZip] = useState<any>(null);
  const [pacote, setPacote] = useState<Pacote | null>(null);
  const [horas, setHoras] = useState<number[]>(HORAS_PADRAO);
  const [inicio, setInicio] = useState(() => paraInputLocal(proximoHorario(HORAS_PADRAO)));
  const [facebook, setFacebook] = useState(true);
  const [prog, setProg] = useState<{ feito: number; total: number; erros: number } | null>(null);
  const [feitos, setFeitos] = useState<Record<string, string>>({});
  const parar = useRef(false);

  const abrir = async (f: File) => {
    try {
      const JSZip = (await import("jszip")).default;
      const z = await JSZip.loadAsync(f);
      const man = z.file("pacote.json");
      if (!man) throw new Error("O ZIP não tem o pacote.json");
      const p = JSON.parse(await man.async("string")) as Pacote;
      if (!p?.itens?.length) throw new Error("pacote.json sem itens");
      setZip(z);
      setPacote(p);
      setFeitos(lerFeitos(p.nome));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Plano: o k-ésimo item de cada fila vai no k-ésimo horário
  const plano = useMemo(() => {
    if (!pacote) return [];
    const feed = pacote.itens.filter((i) => i.fila === "feed");
    const story = pacote.itens.filter((i) => i.fila === "story");
    const n = Math.max(feed.length, story.length);
    const t0 = new Date(inicio);
    const slots = Number.isFinite(t0.getTime()) ? horariosDesde(t0, horas, n) : [];
    const out: Array<ItemPacote & { quando: Date }> = [];
    slots.forEach((q, k) => {
      if (feed[k]) out.push({ ...feed[k], quando: q });
      if (story[k]) out.push({ ...story[k], quando: q });
    });
    return out;
  }, [pacote, inicio, horas]);
  const pendentes = plano.filter((i) => !feitos[i.arquivo]);
  const porDia = horas.length;

  const rodar = async () => {
    if (!pacote || !zip) return;
    if (plano[0] && plano[0].quando.getTime() < Date.now() + 2 * 60_000)
      return toast.error("O primeiro horário já passou: escolha um início no futuro.");
    parar.current = false;
    const lista = pendentes;
    setProg({ feito: 0, total: lista.length, erros: 0 });
    let erros = 0;
    const anotados = { ...feitos };
    for (const [n, i] of lista.entries()) {
      if (parar.current) break;
      try {
        const arq = zip.file(i.arquivo);
        if (!arq) throw new Error("arquivo não está no ZIP");
        const jpg = await paraJpg(await arq.async("blob"));
        const m = await enviarBlob(
          jpg,
          i.arquivo
            .split("/")
            .pop()!
            .replace(/\.\w+$/, ".jpg"),
        );
        const r = await salvarPostFn({
          data: {
            tipo: i.tipo,
            legenda: i.tipo === "STORY" ? "" : i.legenda,
            comentario: i.tipo === "STORY" ? "" : i.comentario,
            midias: [m],
            facebook,
            acao: "agendar",
            quando: i.quando.toISOString(),
          },
        });
        anotados[i.arquivo] = String((r as any)?.id ?? "ok");
        try {
          localStorage.setItem(chaveFeitos(pacote.nome), JSON.stringify(anotados));
        } catch {
          /* sem localStorage: só não retoma */
        }
        setFeitos({ ...anotados });
      } catch (e: any) {
        erros++;
        if (erros <= 3) toast.error(`${i.arquivo}: ${e.message}`);
      }
      setProg({ feito: n + 1, total: lista.length, erros });
    }
    qc.invalidateQueries({ queryKey: ["ig-posts"] });
    toast.success(
      erros
        ? `Agendamento terminou com ${erros} erro(s): clique de novo para tentar só os que faltam`
        : "Tudo agendado! Veja na aba Calendário",
    );
  };

  return (
    <div className="space-y-4">
      <Verificacao />
      {pacote && !!Object.keys(feitos).length && (
        <Card className="flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50/60 p-3 text-sm">
          <span className="flex-1">
            Este navegador marcou <b>{Object.keys(feitos).length}</b> itens deste pacote como já
            agendados. Se as imagens se perderam e você apagou os agendados, recomece do zero.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (
                !window.confirm(
                  "Esquecer o que já foi importado deste pacote e agendar tudo de novo?",
                )
              )
                return;
              try {
                localStorage.removeItem(chaveFeitos(pacote.nome));
              } catch {
                /* sem localStorage */
              }
              setFeitos({});
              toast.success("Pronto: o pacote vai ser agendado inteiro de novo");
            }}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" /> Importar de novo do zero
          </Button>
        </Card>
      )}
      <Card className="space-y-3 p-4">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-5 hover:bg-muted/40">
          <FileArchive className="h-8 w-8 text-primary" />
          <span className="flex-1 text-sm">
            {pacote ? (
              <>
                <b>{pacote.nome}</b> · {pacote.itens.filter((i) => i.fila === "feed").length} posts
                + {pacote.itens.filter((i) => i.fila === "story").length} stories
              </>
            ) : (
              "Escolha o pacote ZIP da campanha (artes + pacote.json)"
            )}
          </span>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <input
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && abrir(e.target.files[0])}
          />
        </label>
        {pacote && (
          <div className="grid gap-4 md:grid-cols-3">
            <Campo r="Começar em">
              <Input
                type="datetime-local"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </Campo>
            <Campo
              r={`Horários (${porDia} por dia: 1 post + 1 story em cada)`}
              className="md:col-span-2"
            >
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 17 }, (_, k) => k + 6).map((h) => (
                  <button
                    key={h}
                    onClick={() =>
                      setHoras((l) => (l.includes(h) ? l.filter((x) => x !== h) : [...l, h]))
                    }
                    className={cn(
                      "rounded px-2 py-1 text-xs font-semibold",
                      horas.includes(h) ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </Campo>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={facebook}
                onChange={(e) => setFacebook(e.target.checked)}
              />
              Publicar também na página do Facebook (posts e stories)
            </label>
          </div>
        )}
      </Card>

      {!!plano.length && (
        <>
          <Card className="flex flex-wrap items-center gap-4 p-4">
            <CalendarClock className="h-6 w-6 text-primary" />
            <div className="flex-1 text-sm">
              <p>
                <b>{plano.length}</b> agendamentos, de{" "}
                <b>
                  {plano[0].quando.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </b>{" "}
                até{" "}
                <b>
                  {plano[plano.length - 1].quando.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </b>
              </p>
              <p className="text-xs text-muted-foreground">
                {Object.keys(feitos).length
                  ? `${plano.length - pendentes.length} já agendados neste navegador; faltam ${pendentes.length}. `
                  : ""}
                Deixe esta aba aberta até terminar (envia uma imagem por vez).
              </p>
            </div>
            {prog && prog.feito < prog.total ? (
              <Button variant="outline" onClick={() => (parar.current = true)}>
                <StopCircle className="mr-1.5 h-4 w-4" /> Parar
              </Button>
            ) : (
              <Button size="lg" onClick={rodar} disabled={!pendentes.length}>
                <CalendarClock className="mr-1.5 h-4 w-4" />
                {pendentes.length ? `Agendar ${pendentes.length}` : "Tudo agendado"}
              </Button>
            )}
          </Card>
          {prog && (
            <div className="flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(prog.feito / Math.max(1, prog.total)) * 100}%` }}
                />
              </div>
              <span className="text-xs tabular-nums">
                {prog.feito}/{prog.total}
                {prog.erros ? ` · ${prog.erros} erro(s)` : ""}
              </span>
              {prog.feito < prog.total && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          )}
          <Card className="overflow-hidden p-0">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">Quando</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Idioma</th>
                    <th className="p-2">Arte / legenda</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {plano.slice(0, 400).map((i) => (
                    <tr key={i.arquivo} className="border-t">
                      <td className="whitespace-nowrap p-2 font-semibold">
                        {i.quando.toLocaleString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-2">{i.tipo === "STORY" ? "Story" : "Post"}</td>
                      <td className="p-2 uppercase">{i.idioma}</td>
                      <td className="max-w-[420px] p-2">
                        <span className="line-clamp-1">
                          {i.titulo || i.legenda.split("\n")[0] || i.arquivo}
                        </span>
                      </td>
                      <td className="p-2 text-right">{feitos[i.arquivo] ? "✔" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// Verificação das publicações (todas, não só as 200 da lista): situação e imagens faltando
function Verificacao() {
  const qc = useQueryClient();
  const [apagando, setApagando] = useState(false);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["ig-verificar"],
    queryFn: () => verificarPostsFn(),
  });
  if (!data)
    return (
      <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando as publicações e as imagens no
        servidor…
      </Card>
    );
  const sem =
    (data.faltando.AGENDADO ?? 0) + (data.faltando.ERRO ?? 0) + (data.faltando.RASCUNHO ?? 0);
  const nomes: Record<string, string> = {
    AGENDADO: "agendados",
    PUBLICADO: "publicados",
    ERRO: "com erro",
    RASCUNHO: "rascunhos",
    PUBLICANDO: "publicando agora",
  };
  return (
    <Card
      className={cn(
        "space-y-3 p-4",
        sem || !data.uploadsDir
          ? "border-red-200 bg-red-50/40"
          : "border-emerald-200 bg-emerald-50/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {sem || !data.uploadsDir ? (
          <AlertTriangle className="h-5 w-5 text-red-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        )}
        <p className="flex-1 font-bold">Verificação das publicações</p>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar de novo"}
        </Button>
      </div>
      <p className="text-sm">
        {data.total} publicações no banco:{" "}
        {Object.entries(data.porStatus)
          .map(([k, n]) => `${n} ${nomes[k] ?? k.toLowerCase()}`)
          .join(" · ")}
        {data.atrasados ? ` · ${data.atrasados} agendados já passaram da hora` : ""}
      </p>
      {!data.uploadsDir && (
        <p className="text-sm font-semibold text-red-700">
          Falta a variável UPLOADS_DIR no hPanel: as imagens enviadas vão para a pasta do app e se
          perdem quando ele é recriado. Coloque o caminho da pasta de uploads e reinicie o app antes
          de importar de novo.
        </p>
      )}
      {data.uploadsDir && !data.pastaExiste && (
        <p className="text-sm font-semibold text-red-700">
          A pasta indicada em UPLOADS_DIR não existe no servidor.
        </p>
      )}
      {sem > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-red-700">
            <b>{sem}</b> publicações não publicadas estão <b>sem imagem</b> no servidor
            {data.faltando.AGENDADO ? ` (${data.faltando.AGENDADO} agendadas)` : ""} e vão falhar.
          </p>
          <Button
            size="sm"
            variant="destructive"
            disabled={apagando}
            onClick={async () => {
              if (
                !window.confirm(
                  `Apagar as ${sem} publicações sem imagem? As publicadas não são tocadas.`,
                )
              )
                return;
              setApagando(true);
              try {
                const r = await apagarPostsSemImagemFn({
                  data: { status: ["AGENDADO", "ERRO", "RASCUNHO"] },
                });
                toast.success(
                  `${r.apagados} publicações sem imagem apagadas. Agora importe o pacote de novo.`,
                );
                qc.invalidateQueries({ queryKey: ["ig-posts"] });
                refetch();
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setApagando(false);
              }
            }}
          >
            {apagando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            Apagar as {sem} sem imagem
          </Button>
        </div>
      ) : (
        <p className="text-sm text-emerald-700">
          Todas as publicações não publicadas têm a imagem no servidor.
        </p>
      )}
    </Card>
  );
}
