import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Zap, ArrowDown, Sparkles } from "lucide-react";
import { PromiseStrategy } from "@/types/criafyStrategy";

interface StrategyPromiseSectionProps {
  promise: PromiseStrategy;
  isEditing: boolean;
  onChange: (updated: PromiseStrategy) => void;
}

export function StrategyPromiseSection({
  promise,
  isEditing,
  onChange,
}: StrategyPromiseSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Seção */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Zap className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">03. Promessa</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Como explicamos para quem é, qual problema resolvemos e através de qual mecanismo.
        </p>
      </div>

      {/* SEQUÊNCIA VISUAL CONECTADA: QUEM -> PROBLEMA -> MECANISMO */}
      <div className="space-y-3 max-w-2xl mx-auto">
        {/* PASSO 1: QUEM */}
        <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
          <CardContent className="p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              1. Para Quem É? (Público-Alvo)
            </span>
            {isEditing ? (
              <Input
                value={promise.forWhom || ""}
                onChange={(e) => onChange({ ...promise, forWhom: e.target.value })}
                placeholder="Ex: Profissionais liberais, donas de clínica de estética..."
                className="text-xs rounded-xl"
              />
            ) : (
              <p className="text-xs font-semibold text-foreground">
                {promise.forWhom || "Público não especificado."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Conector */}
        <div className="flex justify-center text-muted-foreground/60">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* PASSO 2: PROBLEMA */}
        <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
          <CardContent className="p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              2. Qual Problema Principal Resolve?
            </span>
            {isEditing ? (
              <Input
                value={promise.problem || ""}
                onChange={(e) => onChange({ ...promise, problem: e.target.value })}
                placeholder="Ex: Falta de clientes novos e agenda instável..."
                className="text-xs rounded-xl"
              />
            ) : (
              <p className="text-xs font-semibold text-foreground">
                {promise.problem || "Problema não especificado."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Conector */}
        <div className="flex justify-center text-muted-foreground/60">
          <ArrowDown className="w-4 h-4" />
        </div>

        {/* PASSO 3: MECANISMO */}
        <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
          <CardContent className="p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              3. Através de Qual Mecanismo Único?
            </span>
            {isEditing ? (
              <Input
                value={promise.mechanism || ""}
                onChange={(e) => onChange({ ...promise, mechanism: e.target.value })}
                placeholder="Ex: Método Agenda Previsível 3 etapas, automação no WhatsApp..."
                className="text-xs rounded-xl"
              />
            ) : (
              <p className="text-xs font-semibold text-foreground">
                {promise.mechanism || "Mecanismo não especificado."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Conector */}
        <div className="flex justify-center text-primary">
          <ArrowDown className="w-5 h-5 stroke-[2.5]" />
        </div>

        {/* PASSO 4: PROMESSA PRINCIPAL CONSOLIDADA EM DESTAQUE */}
        <Card className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
          <CardContent className="p-6 space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Promessa Principal Consolidada
                </span>
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={promise.corePromise || ""}
                onChange={(e) => onChange({ ...promise, corePromise: e.target.value })}
                placeholder="Ajudo [Quem] a [Resultado Desejado] através de [Mecanismo] sem [Maior Dor/Objeção]..."
                className="text-sm font-semibold rounded-xl min-h-[90px] leading-relaxed"
              />
            ) : (
              <p className="text-base font-bold text-foreground leading-relaxed">
                {promise.corePromise ? `"${promise.corePromise}"` : "Nenhuma promessa principal formulada ainda."}
              </p>
            )}

            <p className="text-[11px] text-muted-foreground">
              Esta promessa orienta o tom das bios, introduções de vídeos, copys de anúncios e ganchos da conta.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
