import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Upload, ImageIcon } from "lucide-react";
import {
  listBanners,
  uploadBannerImage,
  createBanner,
  updateBanner,
  deleteBanner,
  type Banner,
} from "@/lib/banners";
import { BannerImage } from "@/components/BannerImage";

export const Route = createFileRoute("/admin/banners")({
  component: BannersPage,
});

const LINHAS = [
  { value: "AGRICOLA", label: "🚜 Agrícola" },
  { value: "AUTOMOTIVA", label: "🚗 Automotiva" },
] as const;

function BannersPage() {
  const qc = useQueryClient();
  const [linhaAtiva, setLinhaAtiva] = useState<string>("AGRICOLA");

  const banners = useQuery({
    queryKey: ["site_banners", linhaAtiva],
    queryFn: () => listBanners(undefined, linhaAtiva),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["site_banners"] });
    qc.invalidateQueries({ queryKey: ["hero_banners"] });
  };

  const heroes = (banners.data ?? []).filter((b) => b.kind === "hero");
  const strips = (banners.data ?? []).filter((b) => b.kind === "strip");

  return (
    <div className="space-y-8">
      {/* Seletor de Linha */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-1">
        {LINHAS.map((l) => (
          <button
            key={l.value}
            onClick={() => setLinhaAtiva(l.value)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              linhaAtiva === l.value
                ? "bg-white shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Imagem principal (hero)</h2>
          <p className="text-sm text-muted-foreground">
            Imagem exibida no topo da página inicial. Se houver mais de uma ativa, a primeira será
            usada.
          </p>
        </div>
        <UploadForm kind="hero" linha={linhaAtiva} onDone={refresh} recommend="Recomendado: 1600 × 500px" />
        <BannerList items={heroes} onChange={refresh} kind="hero" />
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Banners entre sliders</h2>
          <p className="text-sm text-muted-foreground">
            Faixas horizontais exibidas entre os sliders da home. Tamanho recomendado:{" "}
            <strong>1200 × 40px</strong>.
          </p>
        </div>
        <UploadForm kind="strip" linha={linhaAtiva} onDone={refresh} recommend="Recomendado: 1200 × 40px" />
        <BannerList items={strips} onChange={refresh} kind="strip" />
      </section>
    </div>
  );
}

function UploadForm({
  kind,
  linha,
  onDone,
  recommend,
}: {
  kind: "hero" | "strip";
  linha: string;
  onDone: () => void;
  recommend: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [position, setPosition] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) {
      toast.error("Selecione uma imagem");
      return;
    }
    setBusy(true);
    try {
      const image_path = await uploadBannerImage(file, kind);
      await createBanner({
        kind,
        image_path,
        position,
        link_url: linkUrl.trim() || null,
        active: true,
        linha,
      });
      toast.success("Banner adicionado");
      setFile(null);
      setLinkUrl("");
      setPosition(0);
      onDone();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao enviar";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-4 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label className="text-xs">Imagem</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-muted-foreground">{recommend}</p>
        </div>
        <div>
          <Label className="text-xs">Link (opcional)</Label>
          <Input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Posição</Label>
          <Input
            type="number"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={submit} disabled={busy || !file}>
          <Upload className="mr-2 h-4 w-4" />
          {busy ? "Enviando…" : "Adicionar banner"}
        </Button>
      </div>
    </Card>
  );
}

function BannerList({
  items,
  onChange,
  kind,
}: {
  items: Banner[];
  onChange: () => void;
  kind: "hero" | "strip";
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
        <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhum banner cadastrado.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((b) => (
        <BannerRow key={b.id} banner={b} onChange={onChange} kind={kind} />
      ))}
    </div>
  );
}

function BannerRow({
  banner,
  onChange,
  kind,
}: {
  banner: Banner;
  onChange: () => void;
  kind: "hero" | "strip";
}) {
  const [busy, setBusy] = useState(false);

  const toggleActive = async (v: boolean) => {
    setBusy(true);
    try {
      await updateBanner(banner.id, { active: v });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const setPosition = async (v: number) => {
    setBusy(true);
    try {
      await updateBanner(banner.id, { position: v });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remover este banner?")) return;
    setBusy(true);
    try {
      await deleteBanner(banner.id, banner.image_path);
      toast.success("Banner removido");
      onChange();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao remover";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div
          className={
            kind === "strip"
              ? "w-full max-w-[600px] overflow-hidden rounded border bg-muted"
              : "w-full max-w-[300px] overflow-hidden rounded border bg-muted"
          }
        >
          <BannerImage src={banner.image_path} alt="banner" className="w-full" />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Badge variant="outline">#{banner.id}</Badge>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Posição</Label>
            <Input
              type="number"
              defaultValue={banner.position}
              className="w-20"
              onBlur={(e) => {
                const v = Number(e.target.value) || 0;
                if (v !== banner.position) setPosition(v);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={banner.active} onCheckedChange={toggleActive} disabled={busy} />
            <span className="text-sm">{banner.active ? "Ativo" : "Inativo"}</span>
          </div>
          {banner.link_url && (
            <a
              href={banner.link_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline"
            >
              {banner.link_url}
            </a>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={remove} disabled={busy}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
