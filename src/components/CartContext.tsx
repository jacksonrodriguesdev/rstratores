import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { visitanteAtual } from "@/lib/visitante";

export type CartItem = {
  sku: string;
  codigo?: string; // código real da peça, mostrado ao cliente e na mensagem do WhatsApp
  name: string; // nome original (português), vai entre parênteses na mensagem para a equipe
  nameEs?: string; // nome mostrado no site
  image?: string;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  clearCart: () => void;
  // Avisa o painel de vendas que esta lista foi enviada pelo WhatsApp (chamar antes de clearCart)
  marcarEnviado: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "rs_cart_items";

// Copia o carrinho para o servidor (Admin → Carrinhos). Nunca atrapalha a navegação.
function sincronizar(items: CartItem[], enviado = false) {
  try {
    const vid = visitanteAtual().visitorId;
    if (!vid) return;
    fetch("/api/public/carrinho", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vid, itens: items, enviado }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* sem rede ou sem armazenamento: segue só no aparelho */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when items change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isInitialized]);

  // Envia ao servidor 1,5 s depois da última mudança (e uma vez ao abrir o site, se a lista tem itens)
  const primeira = useRef(true);
  useEffect(() => {
    if (!isInitialized) return;
    if (primeira.current) {
      primeira.current = false;
      if (!items.length) return;
    }
    const t = setTimeout(() => sincronizar(items), 1500);
    return () => clearTimeout(t);
  }, [items, isInitialized]);

  const marcarEnviado = () => sincronizar(items, true);

  const addItem = (newItem: CartItem) => {
    setItems((currentItems) => {
      const existing = currentItems.find((item) => item.sku === newItem.sku);
      if (existing) {
        return currentItems.map((item) =>
          item.sku === newItem.sku ? { ...item, quantity: item.quantity + newItem.quantity } : item,
        );
      }
      return [...currentItems, newItem];
    });
    setIsCartOpen(true); // Auto-open cart when adding item
  };

  const removeItem = (sku: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.sku !== sku));
  };

  const updateQuantity = (sku: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(sku);
      return;
    }
    setItems((currentItems) =>
      currentItems.map((item) => (item.sku === sku ? { ...item, quantity } : item)),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        marcarEnviado,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
