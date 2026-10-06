import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, CheckCircle2 } from "lucide-react";

export function QuoteModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    whatsapp: "",
    mensagem: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.endereco || !formData.whatsapp) {
      toast.error("Completá los campos obligatorios (nombre, ciudad y WhatsApp).");
      return;
    }
    if (!formData.mensagem && !file) {
      toast.error("Adjuntá el presupuesto o escribí qué repuestos necesitás.");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("nome", formData.nome);
      data.append("endereco", formData.endereco);
      data.append("whatsapp", formData.whatsapp);
      data.append("mensagem", formData.mensagem);
      if (file) {
        data.append("file", file);
      }

      const res = await fetch("/api/public/quotes", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "No pudimos enviar el presupuesto");
      }

      setSuccess(true);
      setFormData({ nome: "", endereco: "", whatsapp: "", mensagem: "" });
      setFile(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (success) {
      setTimeout(() => setSuccess(false), 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {success ? (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95 duration-300">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold tracking-tight mb-2">¡Presupuesto recibido!</h2>
            <p className="text-muted-foreground mb-6">
              Nuestro equipo lo revisa y te escribe por WhatsApp con la mejor oferta.
            </p>
            <Button onClick={handleClose} className="w-full">
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Mejoramos tu presupuesto</DialogTitle>
              <DialogDescription>
                ¿Tenés un presupuesto de otro proveedor? Mandánoslo y hacemos lo posible por mejorarlo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nombre completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="09X XXX XXX"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endereco">Ciudad / Departamento *</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Ej.: Tacuarembó"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mensagem">Mensaje / repuestos que necesitás</Label>
                <Textarea
                  id="mensagem"
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  placeholder="Escribí los repuestos, códigos o el modelo del tractor…"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Adjunto (presupuesto de otro proveedor)</Label>
                {file ? (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <span className="text-sm truncate mr-2">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => setFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground font-medium">
                      Tocá para adjuntar un archivo o una foto
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Enviando…" : "Enviar presupuesto"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
