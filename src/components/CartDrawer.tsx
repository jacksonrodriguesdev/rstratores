import { X, Trash2, ShoppingCart, Send } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { getSessionFn } from "@/lib/user-auth";
import { useQuery } from "@tanstack/react-query";
import { PHONE } from "@/lib/whatsapp";

export function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, clearCart } = useCart();

  const sessionQuery = useQuery({
    queryKey: ["auth_session"],
    queryFn: () => getSessionFn(),
  });
  const user = sessionQuery.data;

  if (!isCartOpen) return null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSendQuote = () => {
    if (!user) {
      // Redirect to login if not logged in
      window.location.href = "/login?redirect=/carrinho";
      return;
    }

    // Formats a WhatsApp message
    const lines = items.map((i) => `${i.quantity}x ${i.name} (SKU: ${i.sku})`);
    const message = `Olá, gostaria de solicitar uma cotação para as seguintes peças:\n\n${lines.join("\n")}`;

    // Send to WhatsApp
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${PHONE}&text=${encodedMessage}`, "_blank");

    // Clear cart after sending
    clearCart();
    setIsCartOpen(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 z-[101] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Carrinho
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <ShoppingCart className="h-16 w-16 opacity-20" />
              <p className="text-lg font-medium">Seu carrinho está vazio</p>
              <Button onClick={() => setIsCartOpen(false)} variant="outline" className="mt-4">
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.sku} className="flex gap-4 border-b border-zinc-100 pb-4">
                  <div className="h-20 w-20 flex-shrink-0 bg-zinc-50 rounded-md border border-zinc-200 p-1">
                    {item.image ? (
                      <ProductImage
                        src={item.image}
                        alt={item.name}
                        className="object-contain h-full w-full"
                      />
                    ) : (
                      <div className="h-full w-full bg-zinc-200 rounded" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <h3 className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">SKU: {item.sku}</p>

                    <div className="flex items-center justify-between mt-auto pt-2">
                      <div className="flex items-center border rounded-md border-zinc-300 overflow-hidden">
                        <button
                          className="px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-medium"
                          onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-sm font-semibold border-x border-zinc-300 min-w-[2.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          className="px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-medium"
                          onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.sku)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                        title="Remover item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-6 bg-zinc-50 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-600 font-medium">Total de Itens</span>
              <span className="font-bold text-zinc-900">
                {totalItems} {totalItems === 1 ? "item" : "itens"}
              </span>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSendQuote}
                className="w-full h-14 text-lg font-bold flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <Send className="h-5 w-5" />
                {user ? "Enviar para Cotação" : "Faça Login para Cotar"}
              </Button>
            </div>

            <button
              onClick={clearCart}
              className="w-full text-sm font-semibold text-zinc-500 hover:text-zinc-800 transition-colors py-2"
            >
              Limpar Carrinho
            </button>
          </div>
        )}
      </div>
    </>
  );
}
