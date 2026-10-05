import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImageIcon,
  Monitor,
  Smartphone,
  Trash2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUTOMOTIVA_ATIVA } from "@/lib/linhas";
import {
  listBanners,
  uploadBannerImage,
  createBanner,
  updateBanner,
  deleteBanner,
  TIPOS_BANNER,
  type Banner,
  type BannerKind,
} from "@/lib/banners";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/banners")({
  component: BannersPage,
});

const ORDEM_TIPOS: BannerKind[] = ["hero", "duplo", "strip"];

const urlImagem = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);

function BannersPage() {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<BannerKind>("hero");

  // Com a linha automotiva desligada, mostra todos os banners (e avisa dos marcados como automotivos).
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["site_banners"],
    queryFn: () => listBanners(),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["site_banners"] });
    qc.invalidateQueries({ queryKey: ["hero_banners"] });
    qc.invalidateQueries({ queryKey: ["home_banners"] });
  };

  const daLinhaAutomotiva = AUTOMOTIVA_ATIVA ? [] : todos.filter((b) => b.linha === "AUTOMOTIVA");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Banners da página inicial</h2>
          <p className="text-sm text-muted-foreground">
            Troque aqui todas as imagens promocionais da home. As mudanças aparecem na hora.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/" target="_blank" rel="noreferrer">
            Ver página inicial <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      {daLinhaAutomotiva.length > 0 && (
        <Card className="flex flex-wrap items-center gap-3 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            {daLinhaAutomotiva.length === 1 ? "1 banner está" : `${daLinhaAutomotiva.length} banners estão`}{" "}
            marcado(s) como <strong>linha automotiva</strong> e não aparece(m) no site, que hoje vende só
            peças agrícolas.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              for (const b of daLinhaAutomotiva) await updateBanner(b.id, { linha: "AGRICOLA" });
              toast.success("Banners movidos para a linha agrícola");
              refresh();
            }}
          >
            Mostrar no site
          </Button>
        </Card>
      )}

      <Tabs value={tipo} onValueChange={(v) => setTipo(v as BannerKind)}>
        <TabsList className="h-auto flex-wrap">
          {ORDEM_TIPOS.map((k) => {
            // Conta só o que realmente aparece no site
            const ativos = todos.filter(
              (b) => b.kind === k && b.active && (AUTOMOTIVA_ATIVA || b.linha !== "AUTOMOTIVA"),
            ).length;
            return (
              <TabsTrigger key={k} value={k} className="gap-2">
                {TIPOS_BANNER[k].nome}
                <Badge variant={ativos ? "default" : "secondary"} className="h-5 px-1.5">
                  {ativos}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ORDEM_TIPOS.map((k) => {
          const lista = todos.filter((b) => b.kind === k);
          return (
            <TabsContent key={k} value={k} className="mt-4 space-y-4">
              <Card className="grid gap-2 bg-muted/40 p-4 text-sm md:grid-cols-3">
                <div className="md:col-span-3 text-muted-foreground">{TIPOS_BANNER[k].onde}</div>
                <div className="flex items-start gap-2">
                  <Monitor className="mt-0.5 h-4 w-4 text-primary" />
                  <span>
                    <strong>Computador:</strong> {TIPOS_BANNER[k].desktop}
                  </span>
                </div>
                <div className="flex items-start gap-2 md:col-span-2">
                  <Smartphone className="mt-0.5 h-4 w-4 text-primary" />
                  <span>
                    <strong>Celular:</strong> {TIPOS_BANNER[k].celular}. Sem arte de celular, a do
                    computador é usada e cortada nas laterais.
                  </span>
                </div>
              </Card>

              {k === "duplo" && lista.filter((b) => b.active).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sem banners ativos aqui, a home mostra os dois cartões padrão (Engrenagens e
                  Transmissão / Filtros).
                </p>
              )}

              {isLoading ? (
                <div className="h-40 animate-pulse rounded-lg bg-muted" />
              ) : lista.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
                  <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhum banner deste tipo.</p>
                </div>
              ) : (
                lista.map((b, i) => (
                  <BannerCard
                    key={b.id}
                    banner={b}
                    anterior={lista[i - 1]}
                    proximo={lista[i + 1]}
                    onChange={refresh}
                  />
                ))
              )}

              <NovoBanner kind={k} proximaPosicao={lista.length} onDone={refresh} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

// Moldura com a proporção real do site, para ver o corte antes de publicar.
function Moldura({
  src,
  aspecto,
  rotulo,
  icone: Icone,
  aviso,
  faixaAtalhos,
}: {
  src: string | null;
  aspecto: string;
  rotulo: string;
  icone: typeof Monitor;
  aviso?: string;
  faixaAtalhos?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icone className="h-3.5 w-3.5" /> {rotulo}
      </div>
      <div className={cn("relative overflow-hidden rounded-lg border bg-zinc-100", aspecto)}>
        {src ? (
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Sem imagem
          </div>
        )}
        {faixaAtalhos && src && (
          <div className="absolute inset-x-0 bottom-0 flex h-[20%] items-center justify-center border-t border-dashed border-white/80 bg-white/45 text-[10px] font-semibold text-zinc-700">
            área coberta pelos cartões de atalho
          </div>
        )}
      </div>
      {aviso && <p className="text-[11px] text-amber-700">{aviso}</p>}
    </div>
  );
}

function BannerCard({
  banner,
  anterior,
  proximo,
  onChange,
}: {
  banner: Banner;
  anterior?: Banner;
  proximo?: Banner;
  onChange: () => void;
}) {
  const tipo = TIPOS_BANNER[banner.kind] ?? TIPOS_BANNER.hero;
  const [busy, setBusy] = useState(false);
  const [titulo, setTitulo] = useState(banner.titulo ?? "");
  const [link, setLink] = useState(banner.link_url ?? "");
  useEffect(() => {
    setTitulo(banner.titulo ?? "");
    setLink(banner.link_url ?? "");
  }, [banner.titulo, banner.link_url]);

  const executar = async (fn: () => Promise<void>, sucesso?: string) => {
    setBusy(true);
    try {
      await fn();
      if (sucesso) toast.success(sucesso);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na operação");
    } finally {
      setBusy(false);
    }
  };

  // Troca de posição com o vizinho (usa o índice como posição para evitar empates).
  const mover = (vizinho?: Banner) =>
    vizinho &&
    executar(async () => {
      await updateBanner(banner.id, { position: vizinho.position });
      await updateBanner(vizinho.id, {
        position: banner.position === vizinho.position ? banner.position + 1 : banner.position,
      });
    });

  const trocarImagem = (campo: "image_path" | "image_path_mobile") => async (file: File) =>
    executar(async () => {
      const caminho = await uploadBannerImage(file, banner.kind);
      await updateBanner(banner.id, { [campo]: caminho });
    }, "Imagem trocada");

  const inativoNoSite = !banner.active || (!AUTOMOTIVA_ATIVA && banner.linha === "AUTOMOTIVA");

  return (
    <Card className={cn("p-4", inativoNoSite && "opacity-70")}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grid flex-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Moldura
              src={urlImagem(banner.image_path)}
              aspecto={tipo.aspecto}
              rotulo="Computador"
              icone={Monitor}
              faixaAtalhos={banner.kind === "hero"}
            />
            <BotaoArquivo rotulo="Trocar imagem do computador" onFile={trocarImagem("image_path")} disabled={busy} />
          </div>
          <div className="space-y-2">
            <Moldura
              src={urlImagem(banner.image_path_mobile || banner.image_path)}
              aspecto={tipo.aspectoCelular}
              rotulo="Celular"
              icone={Smartphone}
              aviso={banner.image_path_mobile ? undefined : "Usando a arte do computador (cortada)"}
            />
            <div className="flex flex-wrap gap-2">
              <BotaoArquivo
                rotulo={banner.image_path_mobile ? "Trocar" : "Enviar arte do celular"}
                onFile={trocarImagem("image_path_mobile")}
                disabled={busy}
              />
              {banner.image_path_mobile && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    executar(() => updateBanner(banner.id, { image_path_mobile: null }), "Arte do celular removida")
                  }
                >
                  Remover
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-72">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={banner.active}
                disabled={busy}
                onCheckedChange={(v) => executar(() => updateBanner(banner.id, { active: v }))}
              />
              <span className="text-sm font-medium">{banner.active ? "Ativo no site" : "Desativado"}</span>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={busy || !anterior} onClick={() => mover(anterior)} aria-label="Mover para cima">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={busy || !proximo} onClick={() => mover(proximo)} aria-label="Mover para baixo">
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!AUTOMOTIVA_ATIVA && banner.linha === "AUTOMOTIVA" && (
            <Badge variant="outline" className="w-fit border-amber-400 text-amber-800">
              Linha automotiva: não aparece no site
            </Badge>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Nome (texto alternativo da imagem)</Label>
            <Input
              value={titulo}
              placeholder="Ex.: Promoção de filtros"
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() =>
                titulo !== (banner.titulo ?? "") &&
                executar(() => updateBanner(banner.id, { titulo: titulo.trim() || null }), "Nome salvo")
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link ao clicar (opcional)</Label>
            <Input
              value={link}
              placeholder="/loja?categoria=Filtros ou https://…"
              onChange={(e) => setLink(e.target.value)}
              onBlur={() =>
                link !== (banner.link_url ?? "") &&
                executar(() => updateBanner(banner.id, { link_url: link.trim() || null }), "Link salvo")
              }
            />
          </div>
          <Button
            variant="ghost"
            className="mt-auto justify-start text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() =>
              confirm("Remover este banner e suas imagens?") &&
              executar(() => deleteBanner(banner.id), "Banner removido")
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Remover banner
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BotaoArquivo({
  rotulo,
  onFile,
  disabled,
}: {
  rotulo: string;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => ref.current?.click()}>
        <Upload className="mr-2 h-3.5 w-3.5" /> {rotulo}
      </Button>
    </>
  );
}

function NovoBanner({
  kind,
  proximaPosicao,
  onDone,
}: {
  kind: BannerKind;
  proximaPosicao: number;
  onDone: () => void;
}) {
  const tipo = TIPOS_BANNER[kind];
  const [desktop, setDesktop] = useState<File | null>(null);
  const [celular, setCelular] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  // Pré-visualização local antes de enviar
  const [previa, setPrevia] = useState<{ d: string | null; c: string | null }>({ d: null, c: null });
  useEffect(() => {
    const d = desktop ? URL.createObjectURL(desktop) : null;
    const c = celular ? URL.createObjectURL(celular) : null;
    setPrevia({ d, c });
    return () => {
      d && URL.revokeObjectURL(d);
      c && URL.revokeObjectURL(c);
    };
  }, [desktop, celular]);

  const enviar = async () => {
    if (!desktop) return toast.error("Escolha a imagem do computador");
    setBusy(true);
    try {
      const image_path = await uploadBannerImage(desktop, kind);
      const image_path_mobile = celular ? await uploadBannerImage(celular, kind) : null;
      await createBanner({
        kind,
        image_path,
        image_path_mobile,
        titulo: titulo.trim() || null,
        link_url: link.trim() || null,
        position: proximaPosicao,
        active: true,
        linha: "AGRICOLA",
      });
      toast.success("Banner adicionado e já está no site");
      setDesktop(null);
      setCelular(null);
      setTitulo("");
      setLink("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-dashed p-4">
      <h3 className="mb-3 font-semibold">Adicionar banner — {tipo.nome}</h3>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grid flex-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Moldura src={previa.d} aspecto={tipo.aspecto} rotulo="Computador (obrigatória)" icone={Monitor} faixaAtalhos={kind === "hero"} />
            <BotaoArquivo rotulo={desktop ? "Trocar" : "Escolher imagem"} onFile={setDesktop} disabled={busy} />
          </div>
          <div className="space-y-2">
            <Moldura src={previa.c ?? previa.d} aspecto={tipo.aspectoCelular} rotulo="Celular (opcional)" icone={Smartphone} />
            <BotaoArquivo rotulo={celular ? "Trocar" : "Escolher imagem"} onFile={setCelular} disabled={busy} />
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-72">
          <div className="space-y-1">
            <Label className="text-xs">Nome (texto alternativo)</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Promoção de filtros" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link ao clicar (opcional)</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/loja?categoria=Filtros" />
          </div>
          <Button onClick={enviar} disabled={busy || !desktop} className="mt-auto">
            <Upload className="mr-2 h-4 w-4" />
            {busy ? "Enviando…" : "Publicar banner"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
