import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  ImageIcon,
  Box,
  Link as LinkIcon,
  Settings2,
  Search,
  MessageSquare,
  Send,
  Upload
} from "lucide-react";
import {
  listHomepageBlocks,
  createHomepageBlock,
  updateHomepageBlock,
  deleteHomepageBlock,
  type HomepageBlock,
} from "@/lib/homepage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BannerImage } from "@/components/BannerImage";

export const Route = createFileRoute("/admin/homepage")({
  component: AdminHomepage,
});

const BLOCK_TYPES = [
  { id: "HERO_SLIDER", name: "Slider Principal (Hero)", icon: ImageIcon, desc: "Banner gigantesco no topo da página.", recommend: "1600 × 500px" },
  { id: "FEATURES_STRIP", name: "Barra de Benefícios", icon: Settings2, desc: "Barra de confiança com ícones (Ex: Frete Rápido, Pagamento Seguro)." },
  { id: "CATEGORY_GRID", name: "Grade de Categorias", icon: Box, desc: "Ícones de sistemas populares como Motor, Suspensão, Freios.", recommend: "Nenhuma imagem necessária" },
  { id: "PRODUCTS_CAROUSEL", name: "Carrossel de Peças", icon: LinkIcon, desc: "Uma esteira rolável de peças.", recommend: "Nenhuma imagem necessária" },
  { id: "PRODUCTS_GRID", name: "Grade de Produtos", icon: Box, desc: "Uma grade dinâmica de produtos configurável por segmento e imagens." },
  { id: "PROMO_STRIP", name: "Faixa Promocional (Strip)", icon: Settings2, desc: "Banner estreito horizontal para anúncios.", recommend: "1200 × 200px" },
  { id: "BRANDS_CAROUSEL", name: "Carrossel de Marcas", icon: LinkIcon, desc: "Slider exibindo apenas logotipos das marcas vendidas." },
  { id: "BUSCA_CODIGO", name: "Busca Rápida por Código", icon: Search, desc: "Barra de busca horizontal com fundo cinza." },
  { id: "PROMO_BANNERS_DUPLOS", name: "Banners Promocionais Duplos", icon: ImageIcon, desc: "2 banners promocionais grandes lado a lado." },
  { id: "CAROUSEL_MONTADORAS", name: "Compre por Fabricante (Redondos)", icon: Box, desc: "Grade de logotipos circulares de montadoras." },
  { id: "DEPOIMENTOS", name: "Depoimentos de Clientes", icon: MessageSquare, desc: "Avaliações de clientes sobre a loja." },
  { id: "NEWSLETTER_INSTAGRAM", name: "Newsletter & Instagram", icon: Send, desc: "Chamada dupla para cadastro de email e redes sociais." },
];

function AdminHomepage() {
  const qc = useQueryClient();
  const { data: blocks = [], isLoading } = useQuery({ queryKey: ["homepage_blocks"], queryFn: () => listHomepageBlocks() });

  const refresh = () => qc.invalidateQueries({ queryKey: ["homepage_blocks"] });

  const handleAdd = async (type: string) => {
    try {
      await createHomepageBlock({ data: { type, active: true, position: blocks.length } });
      toast.success("Bloco adicionado!");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Página Inicial (CMS)</h1>
          <p className="text-sm text-muted-foreground">Adicione, reordene e configure os blocos da capa do site.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Adicionar Bloco</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Escolha o modelo de Bloco</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {BLOCK_TYPES.map((b) => (
                <Card 
                  key={b.id} 
                  className="p-4 cursor-pointer hover:border-primary transition-all flex flex-col gap-2"
                  onClick={() => handleAdd(b.id)}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <b.icon className="h-5 w-5 text-primary" />
                    {b.name}
                  </div>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {isLoading && <p>Carregando blocos...</p>}
        {blocks.length === 0 && !isLoading && (
          <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
            Sua página inicial está vazia. Adicione blocos para construir o layout.
          </div>
        )}
        {blocks.map((block) => (
          <BlockRow key={block.id} block={block} onChange={refresh} />
        ))}
      </div>
    </div>
  );
}

function BlockRow({ block, onChange }: { block: HomepageBlock; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const typeInfo = BLOCK_TYPES.find(b => b.id === block.type);
  const [uploading, setUploading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Parse config JSON safely
  const configData = block.config ? JSON.parse(block.config) : {};
  const [title, setTitle] = useState(block.title || "");
  const [subtitle, setSubtitle] = useState(configData.subtitle || "");
  const [link, setLink] = useState(configData.link || "");
  const [imagePath, setImagePath] = useState(configData.image_path || "");
  const [images, setImages] = useState<string[]>(configData.images || []);
  
  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Sync state when dialog opens so it always shows the latest saved config
  useEffect(() => {
    if (configOpen) {
      const currentConfig = block.config ? JSON.parse(block.config) : {};
      setTitle(block.title || "");
      setSubtitle(currentConfig.subtitle || "");
      setLink(currentConfig.link || "");
      setImagePath(currentConfig.image_path || "");
      setImages(currentConfig.images || []);
      setSegment(currentConfig.segment || "AMBOS");
      setOnlyWithImages(currentConfig.onlyWithImages ?? true);
      setLimit(currentConfig.limit || 8);
    }
  }, [configOpen, block]);
  
  // Products Grid configs
  const [segment, setSegment] = useState(configData.segment || "AMBOS");
  const [categoria, setCategoria] = useState(configData.categoria || "");
  const [marca, setMarca] = useState(configData.marca || "");
  const [onlyWithImages, setOnlyWithImages] = useState(configData.onlyWithImages ?? true);
  const [limit, setLimit] = useState(configData.limit || 8);
  const [rows, setRows] = useState(configData.rows || 1);

  const toggleActive = async (v: boolean) => {
    setBusy(true);
    try {
      await updateHomepageBlock({ data: { id: block.id, active: v } });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const setPosition = async (v: number) => {
    setBusy(true);
    try {
      await updateHomepageBlock({ data: { id: block.id, position: v } });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remover este bloco da home?")) return;
    setBusy(true);
    try {
      await deleteHomepageBlock({ data: { id: block.id } });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const saveConfig = async () => {
    setBusy(true);
    try {
      await updateHomepageBlock({ 
        data: {
          id: block.id, 
          title,
          config: JSON.stringify({ 
            link, 
            image_path: imagePath, 
            subtitle, 
            images,
            segment,
            categoria,
            marca,
            onlyWithImages,
            limit,
            rows
          })
        }
      });
      toast.success("Configuração salva");
      setConfigOpen(false);
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    
    try {
      if (block.type === "HERO_SLIDER") {
        // Upload multiple files
        const newPaths: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("file", files[i]);
          formData.append("kind", "hero");
          const res = await fetch("/api/admin/banners/upload", { method: "POST", body: formData });
          if (!res.ok) throw new Error(`Falha no upload da imagem ${i+1}`);
          const { path } = await res.json();
          newPaths.push(path);
        }
        setImages((prev) => [...prev, ...newPaths]);
        toast.success(`${newPaths.length} imagem(ns) adicionada(s) ao slider!`);
      } else {
        // Single upload
        const formData = new FormData();
        formData.append("file", files[0]);
        formData.append("kind", "strip");
        const res = await fetch("/api/admin/banners/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Falha no upload");
        const { path } = await res.json();
        setImagePath(path);
        toast.success("Imagem carregada. Clique em Salvar para aplicar.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const newImages = [...images];
    const item = newImages.splice(draggedIdx, 1)[0];
    newImages.splice(targetIdx, 0, item);
    setImages(newImages);
    setDraggedIdx(null);
  };

  return (
    <Card className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 border-l-4" style={{ borderLeftColor: block.active ? 'hsl(var(--primary))' : 'transparent' }}>
      <div className="cursor-grab text-muted-foreground flex items-center justify-center p-2 hover:bg-muted rounded">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {typeInfo?.icon && <typeInfo.icon className="h-4 w-4 text-primary" />}
          <h3 className="font-semibold text-lg">{typeInfo?.name || block.type}</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {block.title ? `Título: ${block.title}` : "Sem título"} 
          {configData.link && ` | Link: ${configData.link}`}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap bg-muted/50 p-2 rounded-md border">
        <div className="flex items-center gap-2 mr-2">
          <Label className="text-xs font-medium">Ordem</Label>
          <Input
            type="number"
            defaultValue={block.position}
            className="w-16 h-8 text-center"
            onBlur={(e) => {
              const v = Number(e.target.value) || 0;
              if (v !== block.position) setPosition(v);
            }}
          />
        </div>
        <div className="flex items-center gap-2 mr-2">
          <Switch checked={block.active} onCheckedChange={toggleActive} disabled={busy} />
          <span className="text-sm min-w-[40px]">{block.active ? "Visível" : "Oculto"}</span>
        </div>
        
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm"><Settings2 className="h-4 w-4 mr-2" /> Configurar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar {typeInfo?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
              <div className="space-y-2">
                <Label>Título do Bloco (Opcional)</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Peças em Destaque" />
              </div>
              
              {(block.type === "HERO_SLIDER") && (
                <>
                  <div className="space-y-2">
                    <Label>Subtítulo / Descrição</Label>
                    <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ex: Confira as novidades e lançamentos..." />
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Imagens do Slider</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {images.map((img, i) => (
                        <div 
                          key={img} 
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(i)}
                          className={`relative group rounded overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${draggedIdx === i ? 'opacity-50 border-primary' : 'border-transparent'}`}
                        >
                          <BannerImage src={img} alt={`Slide ${i+1}`} className="w-full h-24 object-cover pointer-events-none" />
                          <button 
                            type="button"
                            onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 rounded font-bold pointer-events-none">
                            {i + 1}
                          </div>
                        </div>
                      ))}
                      <div className="border border-dashed rounded flex flex-col items-center justify-center p-4 bg-muted/30 relative min-h-[96px] hover:bg-muted/50 transition-colors">
                        <Upload className="w-6 h-6 text-muted-foreground mb-2 pointer-events-none" />
                        <span className="text-xs text-muted-foreground pointer-events-none text-center">Selecionar Múltiplas</span>
                        <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {uploading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center"><span className="text-xs font-semibold animate-pulse">Enviando...</span></div>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Arraste as imagens para reordená-las.</p>
                    {typeInfo?.recommend && <p className="text-xs text-muted-foreground">Tamanho recomendado: {typeInfo.recommend}</p>}
                  </div>
                </>
              )}
              
              {(block.type === "PRODUCTS_GRID" || block.type === "PRODUCTS_CAROUSEL") && (
                <>
                  <div className="space-y-2">
                    <Label>Segmento</Label>
                    <select 
                      value={segment} 
                      onChange={e => setSegment(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="AMBOS">Todos os Produtos (Ambos)</option>
                      <option value="AGRICOLA">Linha Agrícola</option>
                      <option value="AUTOMOTIVA">Linha Pesada & Automotiva</option>
                    </select>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Categoria (Opcional)</Label>
                    <Input value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Motor, Suspensão, Óleos..." />
                    <p className="text-xs text-muted-foreground">Deixe vazio para trazer todas as categorias do segmento.</p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Marca (Opcional)</Label>
                    <Input value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ex: Ford, Valmet, MWM..." />
                    <p className="text-xs text-muted-foreground">Deixe vazio para trazer todas as marcas.</p>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch id={`img-filter-${block.id}`} checked={onlyWithImages} onCheckedChange={setOnlyWithImages} />
                      <Label htmlFor={`img-filter-${block.id}`}>Mostrar apenas produtos que possuem imagem</Label>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Quantidade Limite (Total de produtos)</Label>
                    <Input type="number" value={limit} onChange={e => setLimit(Number(e.target.value) || 8)} />
                  </div>
                  {block.type === "PRODUCTS_CAROUSEL" && (
                    <div className="space-y-2 mt-4">
                      <Label>Quantidade de Linhas no Carrossel</Label>
                      <select 
                        value={rows} 
                        onChange={e => setRows(Number(e.target.value) || 1)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="1">1 Linha</option>
                        <option value="2">2 Linhas</option>
                        <option value="3">3 Linhas</option>
                      </select>
                    </div>
                  )}
                </>
              )}
              
              {(block.type === "PROMO_STRIP") && (
                <>
                  <div className="space-y-2">
                    <Label>Imagem do Bloco</Label>
                    <div className="flex gap-2 items-center">
                      <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
                      {uploading && <span className="text-xs text-muted-foreground animate-pulse">Enviando...</span>}
                    </div>
                    {typeInfo?.recommend && <p className="text-xs text-muted-foreground">Tamanho recomendado: {typeInfo.recommend}</p>}
                    
                    {imagePath && (
                      <div className="mt-2 rounded overflow-hidden border relative group">
                        <BannerImage src={imagePath} alt="Preview" className="w-full max-h-[150px] object-cover" />
                        <button 
                          type="button"
                          onClick={() => setImagePath("")}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Link de Destino (Opcional)</Label>
                    <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://... ou /loja" />
                  </div>
                </>
              )}
            </div>
            <Button onClick={saveConfig} disabled={busy || uploading} className="w-full mt-4">
              Salvar Configurações
            </Button>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="icon" onClick={remove} disabled={busy}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
