// src/components/quiz/builder/ComponentLibrary.tsx
import React, { useState } from "react";
import { Search, Plus, LayoutGrid, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COMPONENT_REGISTRY, ComponentDefinition } from "../registry/componentRegistry";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";
import { QuizComponent, QuizComponentType, QuizComponentCategory } from "@/types/quiz";

const CATEGORY_LABELS: Record<QuizComponentCategory, string> = {
  content: "Conteúdo & Mídia",
  question: "Perguntas & Quizzes",
  capture: "Campos de Captura (CRM)",
  conversion: "Conversão & CTA",
  structure: "Estrutura & Layout",
  result: "Resultado & Diagnóstico",
};

export const ComponentLibrary: React.FC = () => {
  const [search, setSearch] = useState("");
  const activeStepId = useQuizBuilderStore((s) => s.activeStepId);
  const setActiveStepId = useQuizBuilderStore((s) => s.setActiveStepId);
  const steps = useQuizBuilderStore((s) => s.steps);
  const funnel = useQuizBuilderStore((s) => s.funnel);
  const components = useQuizBuilderStore((s) => s.components);
  const addComponent = useQuizBuilderStore((s) => s.addComponent);
  const isOpen = useQuizBuilderStore((s) => s.isLibraryOpen);
  const toggleLibrary = useQuizBuilderStore((s) => s.toggleLibrary);
  const { toast } = useToast();

  if (!isOpen) {
    return (
      <div className="w-10 bg-card border-r border-border flex flex-col items-center py-3 shrink-0 select-none">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-indigo-600"
          onClick={toggleLibrary}
          title="Expandir Biblioteca de Componentes"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const handleAddComponent = (type: QuizComponentType) => {
    let targetStepId = activeStepId;
    if (!targetStepId && steps.length > 0) {
      targetStepId = steps[0].id;
      setActiveStepId(targetStepId);
    }

    if (!targetStepId || !funnel) {
      toast({ title: "Nenhuma etapa selecionada", description: "Crie ou selecione uma etapa antes de adicionar um componente.", variant: "destructive" });
      return;
    }

    const def = COMPONENT_REGISTRY[type];
    const stepComponents = components.filter((c) => c.stepId === targetStepId);
    const maxOrder = stepComponents.reduce((m, c) => Math.max(m, c.componentOrder), -1);

    const newComponent: QuizComponent = {
      id: crypto.randomUUID(),
      stepId: targetStepId,
      funnelId: funnel.id,
      componentType: type,
      componentOrder: maxOrder + 1,
      config: JSON.parse(JSON.stringify(def.defaultConfig)),
      schemaVersion: def.migrationVersion,
    };

    addComponent(newComponent);
    toast({ title: "Componente adicionado", description: `${def.label} adicionado com sucesso.` });
  };

  const allDefinitions = Object.values(COMPONENT_REGISTRY) as ComponentDefinition[];
  const filtered = allDefinitions.filter(
    (def) =>
      def.label.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(filtered.map((d) => d.category)));

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0 select-none">
      {/* Search Header */}
      <div className="p-3 border-b border-border space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs tracking-wide uppercase text-foreground/80 truncate">
            Biblioteca de Componentes
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={toggleLibrary} title="Recolher Painel">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar componentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/40"
          />
        </div>
      </div>

      {/* Categorized Component List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        {categories.map((cat) => {
          const categoryComponents = filtered.filter((d) => d.category === cat);
          return (
            <div key={cat} className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                {CATEGORY_LABELS[cat] || cat}
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {categoryComponents.map((def) => {
                  const IconComponent = def.icon;
                  return (
                    <div
                      key={def.type}
                      onClick={() => handleAddComponent(def.type)}
                      className="group flex items-center gap-2.5 p-2 rounded-lg border border-border bg-background hover:border-indigo-500 hover:shadow-xs cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className="w-7 h-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{def.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-indigo-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
