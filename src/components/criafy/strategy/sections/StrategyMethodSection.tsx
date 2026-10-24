import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus, Trash2, ArrowRight, ArrowDown, Flag } from "lucide-react";
import { MethodStrategy, MethodStep } from "@/types/criafyStrategy";

interface StrategyMethodSectionProps {
  method: MethodStrategy;
  isEditing: boolean;
  onChange: (updated: MethodStrategy) => void;
}

export function StrategyMethodSection({
  method,
  isEditing,
  onChange,
}: StrategyMethodSectionProps) {
  const [newStepName, setNewStepName] = useState("");

  const handleAddStep = () => {
    if (!newStepName.trim()) return;
    const current = method.steps || [];
    const newStep: MethodStep = {
      stepNumber: current.length + 1,
      name: newStepName.trim(),
      objective: "Objetivo estratégico desta fase.",
      whatHappens: "",
      expectedResult: "",
    };
    onChange({ ...method, steps: [...current, newStep] });
    setNewStepName("");
  };

  const handleRemoveStep = (idx: number) => {
    const current = method.steps || [];
    const filtered = current.filter((_, i) => i !== idx).map((step, i) => ({
      ...step,
      stepNumber: i + 1,
    }));
    onChange({ ...method, steps: filtered });
  };

  const handleUpdateStep = (idx: number, patch: Partial<MethodStep>) => {
    const current = [...(method.steps || [])];
    current[idx] = { ...current[idx], ...patch };
    onChange({ ...method, steps: current });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header da Seção */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <GitBranch className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">04. Método</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          O caminho estruturado que conduz o cliente do Ponto A (problema) ao Ponto B (solução alcançada).
        </p>
      </div>

      {/* BLOCO 1: NOME DO MÉTODO & DIFERENCIAL */}
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nome do Método / Processo</label>
              {isEditing ? (
                <Input
                  value={method.name || ""}
                  onChange={(e) => onChange({ ...method, name: e.target.value })}
                  placeholder="Ex: Método Venda sem Estoque, Funil 7D..."
                  className="text-xs rounded-xl font-bold"
                />
              ) : (
                <p className="text-sm font-bold text-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {method.name || "Método sem nome definido."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Diferencial vs Mercado Tradicional</label>
              {isEditing ? (
                <Input
                  value={method.differential || ""}
                  onChange={(e) => onChange({ ...method, differential: e.target.value })}
                  placeholder="Por que funciona melhor ou mais rápido que outros métodos?"
                  className="text-xs rounded-xl"
                />
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                  {method.differential || "Diferencial não informado."}
                </p>
              )}
            </div>
          </div>

          {/* JORNADA PONTO A -> PONTO B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Ponto A (Ponto de Partida)
              </span>
              {isEditing ? (
                <Textarea
                  value={method.pointA || ""}
                  onChange={(e) => onChange({ ...method, pointA: e.target.value })}
                  placeholder="Como o cliente chega: dores, falta de processos, estresse..."
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {method.pointA || "Estado inicial não informado."}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Ponto B (Destino Final)
              </span>
              {isEditing ? (
                <Textarea
                  value={method.pointB || ""}
                  onChange={(e) => onChange({ ...method, pointB: e.target.value })}
                  placeholder="Como o cliente estará: previsibilidade, lucro, liberdade..."
                  className="text-xs rounded-xl min-h-[70px]"
                />
              ) : (
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  {method.pointB || "Estado final não informado."}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: ETAPAS ESTRUTURADAS DO MÉTODO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Etapas do Método ({method.steps?.length || 0})
          </span>
        </div>

        <div className="space-y-3">
          {(method.steps || []).map((step, idx) => (
            <Card key={idx} className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center">
                      0{step.stepNumber}
                    </span>
                    {isEditing ? (
                      <Input
                        value={step.name}
                        onChange={(e) => handleUpdateStep(idx, { name: e.target.value })}
                        className="text-xs font-bold rounded-xl h-8 max-w-sm"
                      />
                    ) : (
                      <h4 className="font-bold text-sm text-foreground">{step.name}</h4>
                    )}
                  </div>

                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStep(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-500 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Objetivo da Etapa
                    </label>
                    {isEditing ? (
                      <Input
                        value={step.objective || ""}
                        onChange={(e) => handleUpdateStep(idx, { objective: e.target.value })}
                        placeholder="Ex: Atrair visitantes qualificados..."
                        className="text-xs rounded-xl h-8"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/40">
                        {step.objective || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Resultado Esperado
                    </label>
                    {isEditing ? (
                      <Input
                        value={step.expectedResult || ""}
                        onChange={(e) => handleUpdateStep(idx, { expectedResult: e.target.value })}
                        placeholder="Ex: 50 novos contatos por semana..."
                        className="text-xs rounded-xl h-8"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/40">
                        {step.expectedResult || "—"}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!method.steps || method.steps.length === 0) && (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-card/40">
              Nenhuma etapa cadastrada no método. Adicione as etapas do seu processo.
            </div>
          )}
        </div>

        {/* Adicionar etapa em modo de edição */}
        {isEditing && (
          <div className="flex items-center gap-2 pt-1 max-w-md">
            <Input
              value={newStepName}
              onChange={(e) => setNewStepName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddStep())}
              placeholder="Nome da próxima etapa (ex: Converter)..."
              className="text-xs rounded-xl h-9"
            />
            <Button type="button" size="sm" onClick={handleAddStep} className="text-xs rounded-xl h-9 shrink-0">
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Etapa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
