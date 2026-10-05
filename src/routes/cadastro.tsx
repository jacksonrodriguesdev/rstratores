import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [{ title: "Cadastro — RS Trator Peças" }],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    senha: "",
    telefone: "",
    endereco: "",
    cidade: "",
    numero_casa: "",
    ponto_referencia: "",
    cep: "",
    pais: "Brasil",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = "/";
        return;
      }

      setError(data.error || "Erro ao realizar cadastro.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 flex-1">
        <Card className="w-full p-8 shadow-xl border-t-4 border-primary rounded-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">
              Criar Conta
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Preencha seus dados para comprar mais rápido.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-bold text-zinc-700"
                htmlFor="nome_completo"
              >
                Nome Completo / Razão Social
              </label>
              <Input
                id="nome_completo"
                name="nome_completo"
                required
                value={formData.nome_completo}
                onChange={handleChange}
                className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="email">
                  E-mail
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="telefone">
                  Telefone / WhatsApp
                </label>
                <Input
                  id="telefone"
                  name="telefone"
                  required
                  value={formData.telefone}
                  onChange={handleChange}
                  className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="senha">
                Senha
              </label>
              <Input
                id="senha"
                name="senha"
                type="password"
                required
                minLength={6}
                value={formData.senha}
                onChange={handleChange}
                className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="cep">
                  CEP (Opcional)
                </label>
                <Input
                  id="cep"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="pais">
                  País
                </label>
                <select
                  id="pais"
                  name="pais"
                  value={formData.pais}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pais: e.target.value }))}
                  className="w-full h-12 bg-zinc-100/50 border border-zinc-200 focus:border-primary rounded-md px-3"
                >
                  <option value="Brasil">Brasil</option>
                  <option value="Uruguai">Uruguai</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="cidade">
                  Cidade
                </label>
                <Input
                  id="cidade"
                  name="cidade"
                  required
                  value={formData.cidade}
                  onChange={handleChange}
                  className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-zinc-700" htmlFor="endereco">
                  Endereço
                </label>
                <Input
                  id="endereco"
                  name="endereco"
                  required
                  value={formData.endereco}
                  onChange={handleChange}
                  className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
                  placeholder="Rua, Bairro"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label
                  className="mb-1.5 block text-sm font-bold text-zinc-700"
                  htmlFor="numero_casa"
                >
                  Número
                </label>
                <Input
                  id="numero_casa"
                  name="numero_casa"
                  required
                  value={formData.numero_casa}
                  onChange={handleChange}
                  className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-bold text-zinc-700"
                  htmlFor="ponto_referencia"
                >
                  Ponto de Referência
                </label>
                <Input
                  id="ponto_referencia"
                  name="ponto_referencia"
                  required
                  value={formData.ponto_referencia}
                  onChange={handleChange}
                  className="h-12 bg-zinc-100/50 border-zinc-200 focus:border-primary"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-14 text-lg font-bold uppercase tracking-wider rounded-xl mt-4"
            >
              {busy ? "Cadastrando..." : "Cadastrar"}
            </Button>

            <div className="mt-6 text-center text-sm text-zinc-600 border-t pt-6">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Faça login
              </Link>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
