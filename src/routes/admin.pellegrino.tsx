import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Image as ImageIcon, Ruler, Layers, Wrench, RefreshCw } from "lucide-react";
import { listProducts, getPellegrinoStats, formatBRL } from "@/lib/products";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/pellegrino")({
  component: AdminPellegrino,
});

const PAGE_SIZE = 50;

function AdminPellegrino() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["pellegrino-products", { search, page }],
    queryFn: () => listProducts({ search, page, pageSize: PAGE_SIZE, sort: "created-desc" }),
    refetchInterval: 5000 
  });

  const statsQuery = useQuery({
    queryKey: ["pellegrino-stats"],
    queryFn: () => getPellegrinoStats(),
    refetchInterval: 5000 
  });

  const totalPages = Math.ceil((q.data?.total || 0) / PAGE_SIZE);

  const EXPECTED_PRODUCTS = 105701;
  const currentProducts = statsQuery.data?.totalProducts || 0;
  const currentImages = statsQuery.data?.totalImages || 0;
  const productProgress = Math.min(100, (currentProducts / EXPECTED_PRODUCTS) * 100);


  return (
    <div className="flex-1 space-y-6 p-4 lg:p-8 pt-6 bg-muted/10 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 mb-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Catálogo Pellegrino</h2>
            <p className="text-muted-foreground mt-1 text-sm">Visualização em tempo real de TODOS os dados extraídos pelo robô.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-lg px-4 py-1 bg-green-500/20 text-green-700 animate-pulse flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Total no Banco: {q.data?.total || 0} peças
          </Badge>
        </div>
      </div>

      <Card className="p-6 bg-white shadow-sm border-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Produtos Baixados</p>
                <p className="text-2xl font-black text-primary">{currentProducts.toLocaleString('pt-BR')} <span className="text-sm font-normal text-muted-foreground">/ {EXPECTED_PRODUCTS.toLocaleString('pt-BR')}</span></p>
              </div>
              <span className="text-sm font-bold text-primary">{productProgress.toFixed(1)}%</span>
            </div>
            <Progress value={productProgress} className="h-3" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Imagens Salvas (BD)</p>
                <p className="text-2xl font-black text-blue-600">{currentImages.toLocaleString('pt-BR')} <span className="text-sm font-normal text-muted-foreground">arquivos</span></p>
              </div>
              <ImageIcon className="w-6 h-6 text-blue-600/50 mb-1" />
            </div>
            {/* Imagens não tem um limite fixo, então mostramos uma barra de atividade visual simulando progresso infinito ou cheia se > 0 */}
            <Progress value={currentImages > 0 ? 100 : 0} className="h-3 [&>div]:bg-blue-600" />
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, marca, código..."
            className="pl-10 h-11 text-base"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="space-y-8">
        {q.isLoading && (
          <div className="text-center py-12 text-muted-foreground">Carregando catálogo profundo...</div>
        )}
        {!q.isLoading && (!q.data?.rows || q.data.rows.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">Nenhuma peça encontrada ainda.</div>
        )}

        {q.data?.rows?.map((p: any) => (
          <ProductCard key={p.sku} p={p} />
        ))}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
            <div className="text-sm text-muted-foreground">
              Página <span className="font-bold">{page}</span> de <span className="font-bold">{totalPages}</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Página Anterior</Button>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>Próxima Página</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ p }: { p: any }) {
  const [selectedImage, setSelectedImage] = useState(p.imagem_principal);

  return (
    <Card className="overflow-hidden border-2 shadow-sm hover:border-primary/50 transition-colors">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-6">
        
        {/* Esquerda: Imagem Compacta */}
        <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 bg-white border rounded-lg overflow-hidden flex items-center justify-center p-2">
            {p.imagem_principal ? (
                <img src={`/uploads/${p.imagem_principal}?t=${Date.now()}`} alt={p.nome} className="w-full h-full object-contain" />
            ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
            )}
        </div>

        {/* Centro: Informações Principais */}
        <div className="flex-1 min-w-0 space-y-2">
            <h3 className="text-lg font-bold text-primary truncate" title={p.nome}>{p.nome}</h3>
            <div className="flex flex-wrap gap-2">
                <Badge variant="default">{p.marca || "Sem Marca"}</Badge>
                <Badge variant="outline" className="bg-background">Ref: {p.codigo_fabricante}</Badge>
                <Badge variant="outline" className="bg-background">WSID: {p.sku}</Badge>
                {p.peso && <Badge variant="secondary">{p.peso} kg</Badge>}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
                {p.aplicacoes && p.aplicacoes.length > 0 
                  ? `Aplicações: ${p.aplicacoes.map((a:any) => a.veiculo).slice(0,3).join(', ')}...`
                  : 'Nenhuma aplicação vinculada.'}
            </p>
        </div>

        {/* Direita: Preço e Botão do Modal */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Preço de Custo</p>
                <p className="text-xl font-black text-green-700">{formatBRL(p.valor_compra)}</p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="w-full sm:w-auto font-bold uppercase tracking-wider">
                  Ver Informações
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
                  <DialogHeader className="p-6 pb-0">
                      <DialogTitle className="text-2xl font-black text-primary pr-8">{p.nome}</DialogTitle>
                  </DialogHeader>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
                      {/* GALERIA NO MODAL */}
                      <div className="col-span-1 space-y-3">
                          <h4 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" /> Galeria Completa
                          </h4>
                          <div className="aspect-square rounded-xl border-2 bg-white overflow-hidden flex items-center justify-center p-2 shadow-sm">
                              {selectedImage ? (
                                  <img src={`/uploads/${selectedImage}?t=${Date.now()}`} alt={p.nome} className="w-full h-full object-contain" />
                              ) : (
                                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                              )}
                          </div>
                          {p.images && p.images.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                  {p.images.map((img: any) => {
                                      const isActive = selectedImage === img.image_path;
                                      return (
                                          <button 
                                              key={img.id} 
                                              onClick={() => setSelectedImage(img.image_path)}
                                              className={`h-16 w-16 flex-shrink-0 rounded-lg border-2 p-1 transition-all ${isActive ? 'border-primary shadow-sm bg-primary/5' : 'border-border bg-white hover:border-primary/50'}`}
                                          >
                                              <img src={`/uploads/${img.image_path}?t=${Date.now()}`} className="h-full w-full object-contain" />
                                          </button>
                                      );
                                  })}
                              </div>
                          )}
                      </div>

                      {/* DADOS LOGÍSTICOS E SIMILARES */}
                      <div className="col-span-1 lg:col-span-1 space-y-6">
                          <div>
                              <h4 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-3">
                                  <Ruler className="w-4 h-4" /> Logística
                              </h4>
                              <div className="bg-muted/20 rounded-lg p-3 border text-sm space-y-2">
                                  <div className="flex justify-between border-b pb-1">
                                      <span className="text-muted-foreground">Peso Bruto:</span>
                                      <span className="font-semibold">{p.peso ? `${p.peso} kg` : 'N/D'}</span>
                                  </div>
                                  <div className="flex justify-between border-b pb-1">
                                      <span className="text-muted-foreground">Altura:</span>
                                      <span className="font-semibold">{p.altura ? `${p.altura} m` : 'N/D'}</span>
                                  </div>
                                  <div className="flex justify-between border-b pb-1">
                                      <span className="text-muted-foreground">Largura:</span>
                                      <span className="font-semibold">{p.largura ? `${p.largura} m` : 'N/D'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="text-muted-foreground">Profundidade:</span>
                                      <span className="font-semibold">{p.profundidade ? `${p.profundidade} m` : 'N/D'}</span>
                                  </div>
                              </div>
                          </div>

                          {p.similares && p.similares.length > 0 && (
                              <div>
                                  <h4 className="text-sm font-bold uppercase text-muted-foreground mb-3">Códigos Similares</h4>
                                  <div className="flex flex-wrap gap-2">
                                      {p.similares.map((sim: any) => (
                                          <div key={sim.id} className="bg-muted border rounded px-2 py-1 text-xs">
                                              <span className="opacity-70 mr-1">{sim.marca_similar}:</span>
                                              <span className="font-bold">{sim.codigo_similar}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* FICHA TÉCNICA E APLICAÇÕES */}
                      <div className="col-span-1 lg:col-span-2 space-y-6">
                          {p.fichas_tecnicas && p.fichas_tecnicas.length > 0 && (
                              <div>
                                  <h4 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-3">
                                      <Layers className="w-4 h-4" /> Especificações Técnicas
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm bg-muted/10 p-4 rounded-lg border">
                                      {p.fichas_tecnicas.map((ft: any) => (
                                          <div key={ft.id} className="flex flex-col border-b border-border/50 pb-1">
                                              <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{ft.chave.replace(/_/g, ' ')}</span>
                                              <span className="font-medium">{ft.valor}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {p.aplicacoes && p.aplicacoes.length > 0 && (
                              <div>
                                  <h4 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2 mb-3">
                                      <Wrench className="w-4 h-4" /> Veículos Compatíveis
                                  </h4>
                                  <div className="bg-background border rounded-lg overflow-hidden">
                                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                          <table className="w-full text-sm text-left">
                                              <thead className="text-xs uppercase bg-muted/50 sticky top-0">
                                                  <tr>
                                                      <th className="px-3 py-2">Montadora</th>
                                                      <th className="px-3 py-2">Modelo</th>
                                                      <th className="px-3 py-2">Motor</th>
                                                      <th className="px-3 py-2">Anos</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y">
                                                  {p.aplicacoes.map((app: any) => (
                                                      <tr key={app.id} className="hover:bg-muted/30">
                                                          <td className="px-3 py-2 font-medium">{app.montadora}</td>
                                                          <td className="px-3 py-2">{app.veiculo}</td>
                                                          <td className="px-3 py-2 text-muted-foreground">{app.motor}</td>
                                                          <td className="px-3 py-2 font-semibold">{app.ano}</td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </DialogContent>
            </Dialog>
        </div>
      </div>
    </Card>
  );
}
