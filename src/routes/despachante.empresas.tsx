// Despachante → empresas compradoras do Uruguai (importadores): RUT, endereço, contato e despachante
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { empresasDespFn } from "@/lib/despachante/despachante";
import { formatarRut, PAGAMENTOS, STATUS_EMPRESA_PT, TIPOS_EMPRESA, usd } from "@/lib/b2b-comum";
import { Selo, tomStatus } from "@/components/b2b/B2bLayout";

export const Route = createFileRoute("/despachante/empresas")({ component: Empresas });

function Empresas() {
  const { data } = useQuery({ queryKey: ["desp-empresas"], queryFn: () => empresasDespFn() });
  const [q, setQ] = useState("");
  const lista = (data ?? []).filter(
    (e) => !q || `${e.razao_social} ${e.rut} ${e.cidade}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empresas compradoras</h1>
          <p className="text-sm text-slate-500">
            Importadores no Uruguai (dados para fatura, CRT e DUA).
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Razão social, RUT ou cidade"
          className="h-9 w-72 rounded-full border border-slate-200 bg-white px-4 text-sm"
        />
      </div>
      {!data ? (
        <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-slate-400" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((e) => (
            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{e.razao_social}</p>
                  {e.nome_fantasia && <p className="text-xs text-slate-500">{e.nome_fantasia}</p>}
                </div>
                <Selo tom={tomStatus(e.status)}>{STATUS_EMPRESA_PT[e.status]}</Selo>
              </div>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1 text-xs">
                <dt className="text-slate-500">RUT</dt>
                <dd className="font-mono">{formatarRut(e.rut)}</dd>
                <dt className="text-slate-500">Endereço</dt>
                <dd>
                  {[e.endereco, e.cidade, e.departamento, "Uruguai"].filter(Boolean).join(", ")}
                </dd>
                <dt className="text-slate-500">Atividade</dt>
                <dd>{TIPOS_EMPRESA.find(([k]) => k === e.tipo)?.[1]}</dd>
                <dt className="text-slate-500">Contato</dt>
                <dd>
                  {e.contato_nome} {e.contato_cargo && `(${e.contato_cargo})`} · {e.email}{" "}
                  {e.telefone && `· ${e.telefone}`}
                </dd>
                <dt className="text-slate-500">Despachante UY</dt>
                <dd>
                  {e.despachante_nome
                    ? `${e.despachante_nome}${e.despachante_contato ? ` · ${e.despachante_contato}` : ""}`
                    : "não informado"}
                </dd>
                <dt className="text-slate-500">Pagamento</dt>
                <dd>{PAGAMENTOS[e.pagamento] ?? e.pagamento}</dd>
                <dt className="text-slate-500">Histórico</dt>
                <dd>
                  {e.cotacoes} cotação(ões) · aceito {usd(e.aceito)}
                </dd>
              </dl>
            </div>
          ))}
          {!lista.length && (
            <p className="col-span-full py-10 text-center text-sm text-slate-500">
              Nenhuma empresa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
