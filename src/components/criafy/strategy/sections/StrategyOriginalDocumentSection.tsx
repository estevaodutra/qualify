import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Copy, Download, Check, Sparkles } from "lucide-react";
import { OriginalDocument } from "@/types/criafyStrategy";
import { toast } from "sonner";

interface StrategyOriginalDocumentSectionProps {
  originalDocument?: OriginalDocument;
  onOpenImport: () => void;
}

export function StrategyOriginalDocumentSection({
  originalDocument,
  onOpenImport,
}: StrategyOriginalDocumentSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!originalDocument?.rawMarkdown) return;
    navigator.clipboard.writeText(originalDocument.rawMarkdown);
    setCopied(true);
    toast.success("Documento Markdown copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!originalDocument?.rawMarkdown) return;
    const blob = new Blob([originalDocument.rawMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anamnese_original_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Download do arquivo Markdown iniciado!");
  };

  if (!originalDocument || !originalDocument.rawMarkdown) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Documento Original</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Visualizador do documento bruto de anamnese importado para esta conta.
          </p>
        </div>

        <Card className="rounded-2xl border border-dashed border-border/80 bg-card/40">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Nenhuma anamnese original importada</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Ao importar uma entrevista ou diagnóstico em Markdown, o texto integral é preservado aqui para consulta histórica e auditoria.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onOpenImport}
              className="text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Importar Anamnese Agora
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatImportDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Data não identificada";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Documento Original da Anamnese</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Importado em {formatImportDate(originalDocument.importedAt)} • Fonte: {originalDocument.source || "ChatGPT / Manual"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs gap-1.5 rounded-xl border-border/80"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado!" : "Copiar Markdown"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-8 text-xs gap-1.5 rounded-xl border-border/80"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar .md
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-5 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto bg-muted/15">
          {originalDocument.rawMarkdown}
        </CardContent>
      </Card>
    </div>
  );
}
