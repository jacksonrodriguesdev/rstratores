import { useQuery } from "@tanstack/react-query";
import { Package, type LucideIcon } from "lucide-react";
import { listCategories } from "@/lib/categories";
import { CATEGORIAS } from "@/lib/navegacao";
import { categoriaCurtaEs, categoriaEs } from "@/lib/pecas-es";

export type CategoriaLoja = {
  // nome no banco (valor do filtro da loja); rotulo e curto são o que aparece no site, em espanhol
  nome: string;
  rotulo: string;
  curto: string;
  icon: LucideIcon;
  imagem: string | null;
  total: number;
};

const urlImagem = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);

// Categorias exibidas no site (header, barra do celular, home), vindas do banco:
// criar/renomear/excluir no admin aparece no site. Ícone vem da lista conhecida
// (src/lib/navegacao.ts); categorias novas usam um ícone genérico. Nomes em espanhol: src/lib/pecas-es.ts.
// Enquanto carrega, usa a lista conhecida para o menu nunca aparecer vazio.
export function useCategoriasLoja(): CategoriaLoja[] {
  const { data } = useQuery({
    queryKey: ["categorias_loja"],
    queryFn: () => listCategories({ linha: "AGRICOLA", onlyWithProducts: true }),
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return CATEGORIAS.map((c) => ({ ...c, rotulo: categoriaEs(c.nome), curto: categoriaCurtaEs(c.nome), imagem: null, total: 0 }));

  const ordem = (nome: string) => {
    const i = CATEGORIAS.findIndex((c) => c.nome === nome);
    return i === -1 ? CATEGORIAS.length : i;
  };
  return data
    .map((c: any) => {
      const conhecida = CATEGORIAS.find((k) => k.nome === c.nome);
      return {
        nome: c.nome as string,
        rotulo: categoriaEs(c.nome),
        curto: categoriaCurtaEs(c.nome),
        icon: conhecida?.icon ?? Package,
        imagem: c.image_path ? urlImagem(c.image_path) : null,
        total: (c.totalProducts as number) ?? 0,
      };
    })
    .sort((a, b) => ordem(a.nome) - ordem(b.nome) || b.total - a.total);
}
