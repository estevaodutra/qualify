import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, X, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { ProblemDesireStrategy } from "@/types/criafyStrategy";

interface StrategyProblemDesireSectionProps {
  problemDesire: ProblemDesireStrategy;
  isEditing: boolean;
  onChange: (updated: ProblemDesireStrategy) => void;
}

export function StrategyProblemDesireSection({
  problemDesire,
  isEditing,
  onChange,
}: StrategyProblemDesireSectionProps) {
  const [newObjection, setNewObjection] = useState("");
  const [newFear, setNewFear] = useState("");
  const [newBefore, setNewBefore] = useState("");
  const [newAfter, setNewAfter] = useState("");

  const handleAddObjection = () => {
    if (!newObjection.trim()) return;
    const current = problemDesire.objections || [];
    onChange({ ...problemDesire, objections: [...current, newObjection.trim()] });
    setNewObjection("");
  };

  const handleRemoveObjection = (idx: number) => {
    const current = problemDesire.objections || [];
    onChange({ ...problemDesire, objections: current.filter((_, i) => i !== idx) });
  };

  const handleAddBeforeAfter = () => {
    if (!newBefore.trim() || !newAfter.trim()) return;
    const current = problemDesire.beforeAfter || [];
    onChange({
      ...problemDesire,
      beforeAfter: [...current, { before: newBefore.trim(), after: newAfter.trim() }],
    });
    setNewBefore("");
    setNewAfter("");
  };

  const handleRemoveBeforeAfter = (idx: number) => {
    const current = problemDesire.beforeAfter || [];
    onChange({
      ...problemDesire,
      beforeAfter: current.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Seção */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Target className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">02. Problema & Desejo</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Compreenda a dor profunda, as objeções, o conflito e a transformação pretendida pela marca.
        </p>
      </div>

      {/* BLOCO 1: PROBLEMA CENTRAL & DORES EM 5 DIMENSÕES */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Problema Central & Dimensões da Dor
          </span>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Problema Central</label>
            {isEditing ? (
              <Textarea
                value={problemDesire.coreProblem || ""}
                onChange={(e) => onChange({ ...problemDesire, coreProblem: e.target.value })}
                placeholder="Qual o maior problema específico que a marca resolve?"
                className="text-xs rounded-xl min-h-[70px]"
              />
            ) : (
              <p className="text-xs font-medium text-foreground bg-muted/20 p-3.5 rounded-xl border border-border/40 leading-relaxed">
                {problemDesire.coreProblem || "Nenhum problema central cadastrado."}
              </p>
            )}
          </div>

          {/* Dores divididas em 5 dimensões */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Dor Prática</label>
              {isEditing ? (
                <Textarea
                  value={problemDesire.practicalPain || ""}
                  onChange={(e) => onChange({ ...problemDesire, practicalPain: e.target.value })}
                  placeholder="No dia a dia..."
                  className="text-xs rounded-xl min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40">
                  {problemDesire.practicalPain || "—"}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Dor Emocional</label>
              {isEditing ? (
                <Textarea
                  value={problemDesire.emotionalPain || ""}
                  onChange={(e) => onChange({ ...problemDesire, emotionalPain: e.target.value })}
                  placeholder="Como se sente..."
                  className="text-xs rounded-xl min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40">
                  {problemDesire.emotionalPain || "—"}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Dor Financeira</label>
              {isEditing ? (
                <Textarea
                  value={problemDesire.financialPain || ""}
                  onChange={(e) => onChange({ ...problemDesire, financialPain: e.target.value })}
                  placeholder="Impacto financeiro..."
                  className="text-xs rounded-xl min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40">
                  {problemDesire.financialPain || "—"}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Dor de Tempo</label>
              {isEditing ? (
                <Textarea
                  value={problemDesire.timePain || ""}
                  onChange={(e) => onChange({ ...problemDesire, timePain: e.target.value })}
                  placeholder="Quanto tempo perde..."
                  className="text-xs rounded-xl min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40">
                  {problemDesire.timePain || "—"}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Dor de Identidade / Status</label>
              {isEditing ? (
                <Textarea
                  value={problemDesire.identityPain || ""}
                  onChange={(e) => onChange({ ...problemDesire, identityPain: e.target.value })}
                  placeholder="O que pensa sobre si mesma..."
                  className="text-xs rounded-xl min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40">
                  {problemDesire.identityPain || "—"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: OBJEÇÕES & CRENÇAS LIMITANTES */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Objeções de Compra & Consequências
          </span>

          {/* Objeções em Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">Objeções Comuns</label>
            <div className="flex flex-wrap gap-2">
              {(problemDesire.objections || []).map((obj, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs font-medium px-3 py-1 rounded-xl border-border/80 gap-1.5 bg-muted/30"
                >
                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                  <span>{obj}</span>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleRemoveObjection(idx)}
                      className="text-muted-foreground hover:text-rose-500 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {(!problemDesire.objections || problemDesire.objections.length === 0) && !isEditing && (
                <span className="text-xs text-muted-foreground">Nenhuma objeção cadastrada.</span>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center gap-2 pt-1 max-w-md">
                <Input
                  value={newObjection}
                  onChange={(e) => setNewObjection(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddObjection())}
                  placeholder="Ex: 'Não tenho tempo', 'Está caro'..."
                  className="text-xs rounded-xl h-8"
                />
                <Button type="button" size="sm" onClick={handleAddObjection} className="text-xs rounded-xl h-8 shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Consequências de Não Agir</label>
              {isEditing ? (
                <Textarea
                  value={problemDesire.consequences || ""}
                  onChange={(e) => onChange({ ...problemDesire, consequences: e.target.value })}
                  placeholder="O que acontece a curto e longo prazo se nada mudar?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {problemDesire.consequences || "Não informado."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Motivos de Inércia</label>
              {isEditing ? (
                <Textarea
                  value={problemDesire.inertiaReasons || ""}
                  onChange={(e) => onChange({ ...problemDesire, inertiaReasons: e.target.value })}
                  placeholder="Por que continua sem agir mesmo tendo o problema?"
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {problemDesire.inertiaReasons || "Não informado."}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 3: COMPARAÇÃO VISUAL ANTES E DEPOIS */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Transformação: Antes vs Depois
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparativo de estado emocional, operacional e financeiro do cliente.
              </p>
            </div>
          </div>

          {/* Grid Comparativo Lado a Lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna ANTES */}
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
              <span className="font-bold text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                Antes (Estado Atual)
              </span>
              <div className="space-y-2">
                {(problemDesire.beforeAfter || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-background/80 border border-border/50 text-xs text-muted-foreground flex items-center justify-between"
                  >
                    <span>{item.before}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBeforeAfter(idx)}
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {(!problemDesire.beforeAfter || problemDesire.beforeAfter.length === 0) && (
                  <p className="text-xs text-muted-foreground">Ex: Agenda irregular, insegurança diária...</p>
                )}
              </div>
            </div>

            {/* Coluna DEPOIS */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Depois (Transformação Alcançada)
              </span>
              <div className="space-y-2">
                {(problemDesire.beforeAfter || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-background/80 border border-border/50 text-xs font-medium text-foreground flex items-center justify-between"
                  >
                    <span>{item.after}</span>
                  </div>
                ))}
                {(!problemDesire.beforeAfter || problemDesire.beforeAfter.length === 0) && (
                  <p className="text-xs text-muted-foreground">Ex: Agenda previsível, controle e tranquilidade...</p>
                )}
              </div>
            </div>
          </div>

          {/* Adicionar par Antes/Depois em modo de edição */}
          {isEditing && (
            <div className="p-3 rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
              <span className="text-[11px] font-semibold text-foreground block">
                + Adicionar Ponto de Comparação Antes → Depois
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={newBefore}
                  onChange={(e) => setNewBefore(e.target.value)}
                  placeholder="Antes: ex. Dependência de indicação..."
                  className="text-xs rounded-xl"
                />
                <Input
                  value={newAfter}
                  onChange={(e) => setNewAfter(e.target.value)}
                  placeholder="Depois: ex. Aquisição constante e previsível..."
                  className="text-xs rounded-xl"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddBeforeAfter}
                disabled={!newBefore.trim() || !newAfter.trim()}
                className="text-xs rounded-xl"
              >
                Adicionar Comparativo
              </Button>
            </div>
          )}

          {/* Desejo Central & Transformação de Identidade */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <label className="text-xs font-semibold text-foreground">Transformação de Identidade</label>
            {isEditing ? (
              <Textarea
                value={problemDesire.identityTransformation || ""}
                onChange={(e) => onChange({ ...problemDesire, identityTransformation: e.target.value })}
                placeholder="Depois de alcançar o resultado, como essa pessoa passa a se enxergar?"
                className="text-xs rounded-xl min-h-[60px]"
              />
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                {problemDesire.identityTransformation || "Não informada."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
