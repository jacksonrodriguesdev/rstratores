import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Language = "pt-BR" | "es-UY";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt-BR");

  useEffect(() => {
    const saved = localStorage.getItem("store_language") as Language;
    if (saved === "pt-BR" || saved === "es-UY") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("store_language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

const translations: Record<Language, Record<string, string>> = {
  "pt-BR": {
    "header.frete": "Frete grátis para Sul e Sudeste",
    "header.pecas": "Peças originais e paralelas",
    "header.contato": "contato comercial",
    "header.buscar": "Digite o nome da peça, código ou aplicação...",
    "header.trocarLinha": "Trocar Linha",
    "header.faleConosco": "Fale Conosco",
    "header.categorias": "Categorias por Marca",
    "header.verTodas": "Ver todas as peças",
    "header.atendimento": "Atendimento Rápido",
    "header.inicio": "Início",
    "header.loja": "Loja",
    "header.menu": "Menu",
    "header.principaisMarcas": "Principais Marcas",
    "header.chamarWhats": "Chamar no WhatsApp",
    "header.mudarLinha": "Mudar para linha",
    "home.lancamentos": "Lançamentos",
    "home.novidades": "Novidades que acabaram de chegar",
    "home.marcas": "Marcas mais buscadas",
    "home.busquePorSistema": "Busque por Sistema",
    "home.motor": "Motor",
    "home.suspensao": "Suspensão",
    "home.freios": "Freios",
    "home.filtros": "Filtros e Óleos",
    "home.destaques": "Destaques",
    "home.destaquesDesc": "Produtos em destaque no catálogo",
    "home.verTodos": "Ver todos os produtos na loja",
    "home.naoEncontrou": "Não encontrou o que precisava?",
    "home.naoEncontrouDesc":
      "Temos milhares de peças em estoque e recebemos novidades todos os dias. Fale com um de nossos especialistas para encontrar exatamente a peça que você precisa.",
    "home.falarEspecialista": "Falar com Especialista",
    "home.comprePorCategoria": "Compre por Categoria",
    "home.exploreVariedade": "Explore nossa ampla variedade de peças e acessórios",
    "product.detalhes": "Detalhes Técnicos",
    "product.marca": "Marca",
    "product.categoria": "Categoria",
    "product.comprar": "Comprar Agora",
    "product.cotacao": "Solicitar Cotação",
    "product.categoriasQueTalvezPrecise": "Categorias que talvez você precise",
    "product.produtosQuePodemInteressar": "Produtos que podem interessar",
    "product.voltar": "Voltar ao catálogo",
  },
  "es-UY": {
    "header.frete": "Envío gratis al Sur y Sureste",
    "header.pecas": "Piezas originales y paralelas",
    "header.contato": "contacto comercial",
    "header.buscar": "Ingrese el nombre de la pieza, código o aplicación...",
    "header.trocarLinha": "Cambiar Línea",
    "header.faleConosco": "Contáctenos",
    "header.categorias": "Categorías por Marca",
    "header.verTodas": "Ver todas las piezas",
    "header.atendimento": "Atención Rápida",
    "header.inicio": "Inicio",
    "header.loja": "Tienda",
    "header.menu": "Menú",
    "header.principaisMarcas": "Principales Marcas",
    "header.chamarWhats": "Llamar por WhatsApp",
    "header.mudarLinha": "Cambiar a la línea",
    "home.lancamentos": "Lanzamientos",
    "home.novidades": "Novedades que acaban de llegar",
    "home.marcas": "Marcas más buscadas",
    "home.busquePorSistema": "Buscar por Sistema",
    "home.motor": "Motor",
    "home.suspensao": "Suspensión",
    "home.freios": "Frenos",
    "home.filtros": "Filtros y Aceites",
    "home.destaques": "Destacados",
    "home.destaquesDesc": "Productos destacados en el catálogo",
    "home.verTodos": "Ver todos los productos en la tienda",
    "home.naoEncontrou": "¿No encontró lo que necesitaba?",
    "home.naoEncontrouDesc":
      "Tenemos miles de repuestos en stock y recibimos novedades todos los días. Hable con uno de nuestros especialistas para encontrar exactamente la pieza que necesita.",
    "home.falarEspecialista": "Hablar con un Especialista",
    "home.comprePorCategoria": "Comprar por Categoría",
    "home.exploreVariedade": "Explore nuestra amplia variedad de piezas y accesorios",
    "product.detalhes": "Detalles Técnicos",
    "product.marca": "Marca",
    "product.categoria": "Categoría",
    "product.comprar": "Comprar Ahora",
    "product.cotacao": "Solicitar Cotización",
    "product.categoriasQueTalvezPrecise": "Categorías que tal vez necesite",
    "product.produtosQuePodemInteressar": "Productos que pueden interesarle",
    "product.voltar": "Volver al catálogo",
  },
};
