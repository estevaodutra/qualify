import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { CriafyStrategyData } from "@/types/criafyStrategy";
import { parseAnamneseMarkdown, ParseResult } from "@/services/criafy/anamneseParser";
import { ANAMNESE_PROMPT_TEMPLATE } from "@/utils/criafyStrategyDefaults";
import { toast } from "sonner";

interface ImportAnamneseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStrategy: CriafyStrategyData;
  onConfirmImport: (mergedStrategy: CriafyStrategyData) => Promise<void>;
}

type Step = "INPUT" | "ANALYZING" | "REVIEW";

export function ImportAnamneseModal({
  open,
  onOpenChange,
  currentStrategy,
  onConfirmImport,
}: ImportAnamneseModalProps) {
  const [step, setStep] = useState<Step>("INPUT");
  const [rawText, setRawText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(ANAMNESE_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    toast.success("Prompt oficial de Anamnese copiado!");
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleAnalyze = () => {
    if (!rawText.trim()) {
      toast.error("Por favor, cole o documento da anamnese para analisar.");
      return;
    }

    setStep("ANALYZING");

    setTimeout(() => {
      try {
        const result = parseAnamneseMarkdown(
          rawText,
          currentStrategy.accountId,
          currentStrategy.companyId,
          currentStrategy
        );

        if (!result.success) {
          toast.error("Não conseguimos interpretar as seções do documento. Verifique o formato.");
          setStep("INPUT");
          return;
        }

        setParseResult(result);
        setStep("REVIEW");
        toast.success(`Anamnese analisada! ${result.sectionsFound.length} categorias mapeadas.`);
      } catch (err: any) {
        toast.error("Erro ao analisar anamnese: " + err.message);
        setStep("INPUT");
      }
    }, 600);
  };

  const handleConfirm = async () => {
    if (!parseResult) return;
    setSaving(true);
    try {
      await onConfirmImport(parseResult.strategy);
      toast.success("Estratégia atualizada e documento original preservado!");
      onOpenChange(false);
      setStep("INPUT");
      setRawText("");
      setParseResult(null);
    } catch (err: any) {
      toast.error("Erro ao salvar estratégia: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Importar Anamnese Estratégica
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cole o documento gerado a partir da entrevista estratégica. A Criafy analisará o conteúdo antes de preencher a Estratégia.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: INPUT DO TEXTO */}
        {step === "INPUT" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cole abaixo o documento formatado em Markdown ou JSON:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPrompt}
                className="h-7 text-xs gap-1 text-amber-500 hover:text-amber-600"
              >
                {copiedPrompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedPrompt ? "Prompt Copiado" : "Copiar Prompt da Anamnese"}
              </Button>
            </div>

            <Textarea
              placeholder={`# ANAMNESE ESTRATÉGICA COMPLETA\n\n## 1. Contexto da Marca\n### O que é\nMinha empresa vende...\n\nCole aqui o resultado completo da entrevista...`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[320px] font-mono text-xs rounded-xl bg-muted/30 border-border/70 p-3 leading-relaxed"
            />

            <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleAnalyze}
                disabled={!rawText.trim()}
                className="text-xs font-semibold gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analisar Documento
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2: ANALISANDO */}
        {step === "ANALYZING" && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <h3 className="font-bold text-sm">Analisando documento...</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Mapeando público, dores, promessa, método, Big Idea e regras editoriais da marca.
            </p>
          </div>
        )}

        {/* STEP 3: REVISÃO E CONFIRMAÇÃO */}
        {step === "REVIEW" && parseResult && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Anamnese analisada com sucesso</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Dores & Desejos</span>
                  <span className="font-bold text-foreground">{parseResult.stats.painsCount} identificadas</span>
                </div>
                <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Objeções</span>
                  <span className="font-bold text-foreground">{parseResult.stats.objectionsCount} mapeadas</span>
                </div>
                <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Pilares</span>
                  <span className="font-bold text-foreground">{parseResult.stats.pillarsCount} estruturados</span>
                </div>
                <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Regras para IA</span>
                  <span className="font-bold text-foreground">{parseResult.stats.rulesCount} diretrizes</span>
                </div>
              </div>

              {parseResult.missingSections.length > 0 && (
                <div className="pt-2 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Não encontradas no documento: {parseResult.missingSections.join(", ")}.</span>
                </div>
              )}
            </div>

            {/* Destaque das Informações Extraídas */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 text-xs">
              {parseResult.strategy.audience.mainAudience && (
                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider block">Público Principal</span>
                  <p className="font-medium text-foreground">{parseResult.strategy.audience.mainAudience}</p>
                </div>
              )}

              {parseResult.strategy.promise.corePromise && (
                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider block">Promessa Principal</span>
                  <p className="font-medium text-foreground">{parseResult.strategy.promise.corePromise}</p>
                </div>
              )}

              {parseResult.strategy.positioning.bigIdea.finalBigIdea && (
                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider block">Big Idea</span>
                  <p className="font-medium text-foreground">"{parseResult.strategy.positioning.bigIdea.finalBigIdea}"</p>
                </div>
              )}

              {parseResult.strategy.communication.toneOfVoice.length > 0 && (
                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider block">Tom de Voz</span>
                  <p className="font-medium text-foreground">{parseResult.strategy.communication.toneOfVoice.join(" · ")}</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-3">
              As informações selecionadas serão adicionadas à estratégia da conta. O documento original em Markdown será preservado intacto para consulta.
            </p>

            <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("INPUT")}
                disabled={saving}
                className="text-xs"
              >
                Voltar e editar texto
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={saving}
                className="text-xs font-bold gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
              >
                {saving ? "Salvando..." : "Confirmar e Salvar Estratégia"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
