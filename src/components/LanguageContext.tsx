import { createContext, useContext, ReactNode } from "react";

// O site é só em espanhol (Uruguai). O contexto continua existindo para os componentes que
// usam t("chave"); o painel admin não passa por aqui e segue em português.
export type Language = "es-UY";

type LanguageContextType = {
  language: Language;
  t: (key: string) => string;
};

const t = (key: string): string => textos[key] || key;

const LanguageContext = createContext<LanguageContextType>({ language: "es-UY", t });

export function LanguageProvider({ children }: { children: ReactNode }) {
  return <LanguageContext.Provider value={{ language: "es-UY", t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

const textos: Record<string, string> = {
    "header.frete": "Envíos a todo Uruguay por DAC",
    "header.pecas": "Repuestos originales y alternativos",
    "header.contato": "contacto comercial",
    "header.buscar": "Buscá por nombre, código o aplicación…",
    "header.trocarLinha": "Cambiar Línea",
    "header.faleConosco": "Contactanos",
    "header.categorias": "Categorías por Marca",
    "header.verTodas": "Ver todas las piezas",
    "header.atendimento": "Atención Rápida",
    "header.inicio": "Inicio",
    "header.loja": "Tienda",
    "header.menu": "Menú",
    "header.principaisMarcas": "Principales Marcas",
    "header.chamarWhats": "Escribinos por WhatsApp",
    "header.mudarLinha": "Cambiar a la línea",
    "home.lancamentos": "Lanzamientos",
    "home.novidades": "Novedades que acaban de llegar",
    "home.marcas": "Marcas más buscadas",
    "home.busquePorSistema": "Buscar por sistema",
    "home.motor": "Motor",
    "home.suspensao": "Suspensión",
    "home.freios": "Frenos",
    "home.filtros": "Filtros y Aceites",
    "home.destaques": "Destacados",
    "home.destaquesDesc": "Productos destacados en el catálogo",
    "home.verTodos": "Ver todos los productos en la tienda",
    "home.naoEncontrou": "¿No encontraste lo que buscabas?",
    "home.naoEncontrouDesc":
      "Tenemos miles de repuestos y recibimos novedades todos los días. Hablá con uno de nuestros especialistas y te ayudamos a encontrar la pieza exacta que necesitás.",
    "home.falarEspecialista": "Hablar con un especialista",
    "home.comprePorCategoria": "Comprar por categoría",
    "home.exploreVariedade": "Explorá nuestra amplia variedad de repuestos",
    "product.detalhes": "Detalles técnicos",
    "product.marca": "Marca",
    "product.categoria": "Categoría",
    "product.comprar": "Comprar ahora",
    "product.cotacao": "Pedir cotización",
    "product.categoriasQueTalvezPrecise": "Categorías que te pueden servir",
    "product.produtosQuePodemInteressar": "Productos que te pueden interesar",
    "product.voltar": "Volver al catálogo",
  };
