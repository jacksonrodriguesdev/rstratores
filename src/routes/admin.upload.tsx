import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileSpreadsheet, FileArchive, CheckCircle2, AlertTriangle, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  parseCsv,
  importProducts,
  importImagesZip,
  type CsvRow,
  type ImportProgress,
  type ZipImportProgress,
} from "@/lib/upload";
import { formatBRL } from "@/lib/products";

export const Route = createFileRoute("/admin/upload")({
  component: UploadPage,
});

function UploadPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CsvUploadCard />
      <ZipUploadCard />
    </div>
  );
}

function CsvUploadCard() {
  const qc = useQueryClient();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<ImportProgress | null>(null);

  const onFile = async (f: File | null) => {
    setCsvFile(f);
    setPreview(null);
    setDone(null);
    setProgress(null);
    setParseErrors([]);
    if (!f) return;
    try {
      const { rows, errors } = await parseCsv(f);
      setPreview(rows.slice(0, 5));
      setTotalRows(rows.length);
      setParseErrors(errors);
      (window as unknown as { __csvRows: CsvRow[] }).__csvRows = rows;
    } catch (e) {
      toast.error("Erro ao ler CSV: " + (e as Error).message);
    }
  };

  const runImport = async () => {
    const rows = (window as unknown as { __csvRows?: CsvRow[] }).__csvRows;
    if (!rows) return;
    setImporting(true);
    setDone(null);
    try {
      const result = await importProducts(rows, (p) => setProgress({ ...p }));
      setDone(result);
      toast.success(`${result.inserted} produtos importados`);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["facets"] });
    } catch (e) {
      toast.error("Falha na importação: " + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const pct = progress ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Upload de produtos (CSV)</h2>
          <p className="text-xs text-muted-foreground">
            Colunas: sku, nome, preco_brl, categoria, marca, estoque, peso, url, imagem, descricao
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-muted/50">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm font-medium">
          {csvFile ? csvFile.name : "Clique para selecionar produtos.csv"}
        </span>
        <span className="text-xs text-muted-foreground">Até 200 MB</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {parseErrors.length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{parseErrors.length} linha(s) com problema</AlertTitle>
          <AlertDescription className="max-h-32 overflow-y-auto text-xs">
            {parseErrors.slice(0, 10).map((e, i) => (
              <div key={i}>{e}</div>
            ))}
            {parseErrors.length > 10 && <div>… e mais {parseErrors.length - 10}</div>}
          </AlertDescription>
        </Alert>
      )}

      {preview && preview.length > 0 && !done && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm">
              <strong>{totalRows.toLocaleString("pt-BR")}</strong> produtos prontos para importação
            </div>
            <Badge variant="secondary">Prévia de 5</Badge>
          </div>
          <div className="mt-2 overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((r) => (
                  <TableRow key={r.sku}>
                    <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.nome}</TableCell>
                    <TableCell className="text-right">{formatBRL(r.preco_brl)}</TableCell>
                    <TableCell>{r.categoria ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button className="mt-4 w-full" onClick={runImport} disabled={importing} size="lg">
            {importing ? "Importando…" : `Importar ${totalRows.toLocaleString("pt-BR")} produtos`}
          </Button>
        </>
      )}

      {importing && progress && (
        <div className="mt-4 space-y-2">
          <Progress value={pct} />
          <div className="text-xs text-muted-foreground">
            {progress.processed.toLocaleString("pt-BR")} / {progress.total.toLocaleString("pt-BR")}{" "}
            ({pct}%)
          </div>
        </div>
      )}

      {done && (
        <Alert className="mt-4 border-primary/30 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle>Importação concluída</AlertTitle>
          <AlertDescription>
            {done.inserted.toLocaleString("pt-BR")} processados,{" "}
            {done.failed.toLocaleString("pt-BR")} falharam.
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}

function ZipUploadCard() {
  const qc = useQueryClient();
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ZipImportProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<ZipImportProgress | null>(null);

  const run = async () => {
    if (!zipFile) return;
    setRunning(true);
    setDone(null);
    setProgress(null);
    try {
      const result = await importImagesZip(zipFile, (p) => setProgress({ ...p }));
      setDone(result);
      toast.success(`${result.uploaded} imagens enviadas`);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e) {
      toast.error("Falha no upload de imagens: " + (e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const pct = progress ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-accent/20 p-2 text-accent-foreground">
          <FileArchive className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Upload de imagens (ZIP)</h2>
          <p className="text-xs text-muted-foreground">
            Estrutura esperada: <code>produtos/SKU_XXXX/main.jpg</code>, <code>thumb_1.jpg</code>…
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-muted/50">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm font-medium">
          {zipFile ? zipFile.name : "Clique para selecionar imagens_produtos.zip"}
        </span>
        <span className="text-xs text-muted-foreground">Até 200 MB</span>
        <input
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            setZipFile(e.target.files?.[0] ?? null);
            setDone(null);
            setProgress(null);
          }}
        />
      </label>

      {zipFile && !running && !done && (
        <Button className="mt-4 w-full" size="lg" onClick={run}>
          Enviar imagens
        </Button>
      )}

      {running && progress && (
        <div className="mt-4 space-y-2">
          <Progress value={pct} />
          <div className="text-xs text-muted-foreground">
            {progress.processed} / {progress.total} pastas — {progress.uploaded} imagens enviadas
          </div>
        </div>
      )}

      {done && (
        <Alert className="mt-4 border-primary/30 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle>Upload concluído</AlertTitle>
          <AlertDescription className="space-y-1">
            <div>{done.uploaded.toLocaleString("pt-BR")} imagens enviadas</div>
            <div>{done.skipped.toLocaleString("pt-BR")} SKUs ignorados (não existem no banco)</div>
            {done.errors.length > 0 && (
              <div className="text-destructive">
                {done.errors.length} erros — importe primeiro o CSV de produtos.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
