// Admin → Empresas (atacado) → Despachantes: cria a conta (convite por link de uso único, 7 dias),
// reenvia convite e ativa/desativa o acesso (desativar derruba as sessões na hora).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, MailPlus, Power, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Selo } from "@/components/b2b/B2bLayout";
import {
  acessoDespachanteFn,
  criarDespachanteFn,
  despachantesFn,
  novoConviteFn,
} from "@/lib/despachante/despachante";

export function AdminDespachantes() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["despachantes"], queryFn: () => despachantesFn() });
  const [f, setF] = useState({ nome: "", email: "", escritorio: "", registro: "", telefone: "" });
  const [salvando, setSalvando] = useState(false);
  const [link, setLink] = useState<{ link: string; enviado: boolean; email: string } | null>(null);
  const recarregar = () => qc.invalidateQueries({ queryKey: ["despachantes"] });
  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const r = await criarDespachanteFn({ data: f });
      setLink({ ...r, email: f.email });
      setF({ nome: "", email: "", escritorio: "", registro: "", telefone: "" });
      recarregar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-bold">Novo despachante</h3>
        <p className="text-sm text-muted-foreground">
          Ele acessa <b>/despachante</b>: todas as cotações e embarques, dados para a DU-E, NCM e
          origem dos produtos, empresas compradoras, nossos dados de exportador e ferramentas. A
          senha é criada por ele mesmo, pelo link do convite.
        </p>
        <form onSubmit={criar} className="mt-4 grid gap-3 md:grid-cols-3">
          <Input
            required
            placeholder="Nome"
            value={f.nome}
            onChange={(e) => setF({ ...f, nome: e.target.value })}
          />
          <Input
            required
            type="email"
            placeholder="E-mail"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
          <Input
            placeholder="Escritório / empresa"
            value={f.escritorio}
            onChange={(e) => setF({ ...f, escritorio: e.target.value })}
          />
          <Input
            placeholder="Registro (opcional)"
            value={f.registro}
            onChange={(e) => setF({ ...f, registro: e.target.value })}
          />
          <Input
            placeholder="Telefone"
            value={f.telefone}
            onChange={(e) => setF({ ...f, telefone: e.target.value })}
          />
          <Button type="submit" disabled={salvando}>
            {salvando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-4 w-4" />
            )}
            Criar e gerar convite
          </Button>
        </form>
        {link && <LinkConvite {...link} fechar={() => setLink(null)} />}
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Despachante</th>
              <th className="p-3">Escritório</th>
              <th className="p-3">Acesso</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">
                  <p className="font-semibold">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">{d.email}</p>
                </td>
                <td className="p-3 text-xs">
                  {d.escritorio ?? "—"}
                  {d.registro && <p className="text-muted-foreground">Reg. {d.registro}</p>}
                  {d.telefone && <p className="text-muted-foreground">{d.telefone}</p>}
                </td>
                <td className="p-3">
                  {!d.ativo ? (
                    <Selo tom="vermelho">Desativado</Selo>
                  ) : d.senhaCriada ? (
                    <Selo tom="verde">Ativo</Selo>
                  ) : (
                    <Selo tom="ambar">
                      {d.convitePendente ? "Convite enviado" : "Convite vencido"}
                    </Selo>
                  )}
                </td>
                <td className="space-x-1 p-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const r = await novoConviteFn({ data: { id: d.id } });
                        setLink({ ...r, email: d.email });
                        recarregar();
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    <MailPlus className="mr-1 h-3.5 w-3.5" />{" "}
                    {d.senhaCriada ? "Link para trocar senha" : "Novo convite"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={d.ativo ? "text-destructive" : ""}
                    onClick={async () => {
                      await acessoDespachanteFn({ data: { id: d.id, ativo: !d.ativo } });
                      toast.success(
                        d.ativo ? "Acesso desativado (sessões encerradas)" : "Acesso reativado",
                      );
                      recarregar();
                    }}
                  >
                    <Power className="mr-1 h-3.5 w-3.5" /> {d.ativo ? "Desativar" : "Reativar"}
                  </Button>
                </td>
              </tr>
            ))}
            {data && !data.length && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Nenhum despachante ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function LinkConvite({
  link,
  enviado,
  email,
  fechar,
}: {
  link: string;
  enviado: boolean;
  email: string;
  fechar: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
      <p className="font-semibold text-emerald-900">
        Convite pronto{enviado ? ` e enviado por e-mail para ${email}` : ""}.
      </p>
      <p className="mt-1 text-xs text-emerald-900/80">
        {enviado
          ? "Se preferir, mande também pelo WhatsApp:"
          : "Envie este link para o despachante (WhatsApp ou e-mail):"}{" "}
        vale 7 dias e funciona uma vez só.
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          readOnly
          value={link}
          className="font-mono text-xs"
          onFocus={(e) => e.target.select()}
        />
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(link).catch(() => {});
            toast.success("Link copiado");
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Acesso ao painel do despachante da AGRO PARTS (crie sua senha): ${link}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
        <Button variant="ghost" onClick={fechar}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
