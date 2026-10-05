import {
  Settings,
  Wrench,
  Droplet,
  OctagonAlert,
  CircleDot,
  Bolt,
  Disc3,
  Boxes,
  Construction,
  Package,
  type LucideIcon,
} from "lucide-react";

// Categorias agrícolas (nomes iguais ao banco, para o filtro da loja funcionar).
export const CATEGORIAS: Array<{ nome: string; curto: string; icon: LucideIcon }> = [
  { nome: "Engrenagens e Transmissão", curto: "Transmissão", icon: Settings },
  { nome: "Hidráulica e Pneumática", curto: "Hidráulica", icon: Wrench },
  { nome: "Filtros", curto: "Filtros", icon: Droplet },
  { nome: "Vedações", curto: "Vedações", icon: OctagonAlert },
  { nome: "Rolamentos e Mancais", curto: "Rolamentos", icon: CircleDot },
  { nome: "Elementos de Fixação", curto: "Fixação", icon: Bolt },
  { nome: "Freios e Embreagens", curto: "Freios", icon: Disc3 },
  { nome: "Estrutura e Suspensão", curto: "Estrutura", icon: Construction },
  { nome: "Elétrica e Sensores", curto: "Elétrica", icon: Boxes },
  { nome: "Outros Componentes", curto: "Outros", icon: Package },
];

export function iconeCategoria(nome: string): LucideIcon {
  return CATEGORIAS.find((c) => c.nome === nome)?.icon ?? Package;
}

// Montadoras (nomes iguais ao campo `marca` da tabela agricolas).
export const MONTADORAS = [
  "Massey Ferguson",
  "Valtra",
  "New Holland",
  "John Deere",
  "Case IH",
  "Ford",
  "Agrale",
];

// Redes sociais: preencha com os endereços reais. Ícones e botões só aparecem quando preenchidos.
export const INSTAGRAM_URL = "";
export const FACEBOOK_URL = "";
