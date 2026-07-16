// src/components/quiz/builder/StepSidebar.tsx
import React from "react";
import { Plus, Trash2, Copy, Layers, GripVertical, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";
import { QuizStep } from "@/types/quiz";
import { cn } from "@/lib/utils";

export const StepSidebar: React.FC = () => {
  const steps = useQuizBuilderStore((s) => s.steps);
  const activeStepId = useQuizBuilderStore((s) => s.activeStepId);
  const setActiveStepId = useQuizBuilderStore((s) => s.setActiveStepId);
  const addStep = useQuizBuilderStore((s) => s.addStep);
  const deleteStep = useQuizBuilderStore((s) => s.deleteStep);
  const duplicateStep = useQuizBuilderStore((s) => s.duplicateStep);
  const funnel = useQuizBuilderStore((s) => s.funnel);
  const isOpen = useQuizBuilderStore((s) => s.isStepSidebarOpen);
  const toggleStepSidebar = useQuizBuilderStore((s) => s.toggleStepSidebar);

  if (!isOpen) {
    return (
      <div className="w-10 bg-card border-r border-border flex flex-col items-center py-3 shrink-0 select-none">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-indigo-600"
          onClick={toggleStepSidebar}
          title="Expandir Etapas"
        >
          <Layers className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const handleAddStep = () => {
    if (!funnel) return;
    const newStep: QuizStep = {
      id: crypto.randomUUID(),
      funnelId: funnel.id,
      name: `Etapa ${steps.length + 1}`,
      stepOrder: steps.length,
      type: "question",
      showLogo: true,
      showProgress: true,
      allowBack: true,
    };
    addStep(newStep);
  };

  const handleDuplicateStep = (e: React.MouseEvent, step: QuizStep) => {
    e.stopPropagation();
    if (!funnel) return;
    duplicateStep(step.id);
  };

  const handleDeleteStep = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    if (steps.length <= 1) return;
    deleteStep(stepId);
  };

  return (
    <div className="w-60 bg-card border-r border-border flex flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-semibold text-xs tracking-wide uppercase truncate">Etapas do Funil</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-600 hover:bg-indigo-50" onClick={handleAddStep} title="Nova Etapa">
            <Plus className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={toggleStepSidebar} title="Recolher Painel">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Step List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {steps.map((step, idx) => {
          const isActive = step.id === activeStepId;

          return (
            <div
              key={step.id}
              onClick={() => setActiveStepId(step.id)}
              className={cn(
                "group flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all",
                isActive
                  ? "bg-indigo-600/10 border-indigo-600 text-indigo-950 font-semibold shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="truncate">{step.name}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => handleDuplicateStep(e, step)}
                  className="p-1 hover:text-indigo-600 transition-colors"
                  title="Duplicar Etapa"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteStep(e, step.id)}
                    className="p-1 hover:text-rose-600 transition-colors"
                    title="Excluir Etapa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Add Action */}
      <div className="p-3 border-t border-border shrink-0">
        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-dashed" onClick={handleAddStep}>
          <Plus className="w-3.5 h-3.5" /> Adicionar Nova Etapa
        </Button>
      </div>
    </div>
  );
};
