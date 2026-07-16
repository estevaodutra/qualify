// src/components/quiz/builder/ComponentLibrary.tsx
import React, { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const funnel = useQuizBuilderStore((s) => s.funnel);
  const components = useQuizBuilderStore((s) => s.components);
  const addComponent = useQuizBuilderStore((s) => s.addComponent);

  const handleAddComponent = (type: QuizComponentType) => {
    if (!activeStepId || !funnel) return;

    const def = COMPONENT_REGISTRY[type];
    const stepComponents = components.filter((c) => c.stepId === activeStepId);
    const maxOrder = stepComponents.reduce((m, c) => Math.max(m, c.componentOrder), -1);

    const newComponent: QuizComponent = {
      id: crypto.randomUUID(),
      stepId: activeStepId,
      funnelId: funnel.id,
      componentType: type,
      componentOrder: maxOrder + 1,
      config: JSON.parse(JSON.stringify(def.defaultConfig)),
      schemaVersion: def.migrationVersion,
    };

    addComponent(newComponent);
  };

  const allDefinitions = Object.values(COMPONENT_REGISTRY) as ComponentDefinition[];
  const filtered = allDefinitions.filter(
    (def) =>
      def.label.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(filtered.map((d) => d.category)));

  return (
    <div className="w-72 bg-card border-r border-border flex flex-col h-full shrink-0 select-none">
      {/* Search Header */}
      <div className="p-3 border-b border-border space-y-2">
        <span className="font-semibold text-xs tracking-wide uppercase text-foreground/80">Biblioteca de Componentes</span>
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
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
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
                      className="group flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background hover:border-indigo-500 hover:shadow-xs cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <IconComponent className="w-4 h-4" />
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
