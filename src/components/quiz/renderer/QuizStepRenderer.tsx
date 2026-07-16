// src/components/quiz/renderer/QuizStepRenderer.tsx
import React from "react";
import { QuizStep, QuizComponent, QuizDesignConfig } from "@/types/quiz";
import { QuizComponentRenderer } from "./QuizComponentRenderer";
import { ArrowLeft } from "lucide-react";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";

interface StepRendererProps {
  step: QuizStep;
  components: QuizComponent[];
  designConfig: QuizDesignConfig;
  currentStepIndex: number;
  totalSteps: number;
  formValues: Record<string, string>;
  selectedOptions: Record<string, string[]>;
  validationErrors: Record<string, string>;
  isEditor?: boolean;
  activeComponentId?: string | null;
  submitting?: boolean;
  onFormChange?: (componentId: string, val: string) => void;
  onOptionSelect?: (componentId: string, optionId: string, destination: string | null) => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onSelectComponent?: (id: string) => void;
}

export const QuizStepRenderer: React.FC<StepRendererProps> = ({
  step,
  components,
  designConfig,
  currentStepIndex,
  totalSteps,
  formValues,
  selectedOptions,
  validationErrors,
  isEditor = false,
  activeComponentId = null,
  submitting = false,
  onFormChange,
  onOptionSelect,
  onNextStep,
  onPrevStep,
  onSelectComponent,
}) => {
  const d = designConfig;
  const progressPercent = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;
  const borderRadius = d.borderRadius || "12px";

  const duplicateComponent = useQuizBuilderStore((s) => s.duplicateComponent);
  const deleteComponent = useQuizBuilderStore((s) => s.deleteComponent);
  const reorderComponents = useQuizBuilderStore((s) => s.reorderComponents);

  const handleMoveUp = (id: string) => {
    const ids = components.map((c) => c.id);
    const idx = ids.indexOf(id);
    if (idx > 0) {
      const newIds = [...ids];
      const temp = newIds[idx - 1];
      newIds[idx - 1] = newIds[idx];
      newIds[idx] = temp;
      reorderComponents(step.id, newIds);
    }
  };

  const handleMoveDown = (id: string) => {
    const ids = components.map((c) => c.id);
    const idx = ids.indexOf(id);
    if (idx < ids.length - 1) {
      const newIds = [...ids];
      const temp = newIds[idx + 1];
      newIds[idx + 1] = newIds[idx];
      newIds[idx] = temp;
      reorderComponents(step.id, newIds);
    }
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: isEditor ? "100%" : `${d.contentMaxWidth || 540}px`,
    borderRadius,
    backgroundColor: d.cardEnabled ? d.cardBackgroundColor || "#ffffff" : "transparent",
    color: d.textColor || "#0f172a",
    boxShadow: d.cardEnabled && d.cardShadow !== "none" ? "0 10px 25px -5px rgba(0, 0, 0, 0.1)" : "none",
    padding: `${d.cardPadding || 24}px`,
  };

  return (
    <div className="w-full flex flex-col items-center justify-start transition-all">
      <div style={containerStyle} className="w-full relative overflow-visible transition-all duration-300">
        {/* Step Top Progress Bar */}
        {step.showProgress && d.progress?.style !== "none" && (
          <div className="w-full h-1.5 bg-muted/30 absolute top-0 left-0 right-0 overflow-hidden">
            <div
              style={{ width: `${progressPercent}%`, backgroundColor: d.primaryColor }}
              className="h-full transition-all duration-500"
            />
          </div>
        )}

        <div className="pt-1 space-y-1.5">
          {/* Logo Header */}
          {step.showLogo && d.logo?.url && (
            <div
              className={`flex mb-2 ${
                d.logo.alignment === "left" ? "justify-start" : d.logo.alignment === "right" ? "justify-end" : "justify-center"
              }`}
            >
              <img
                src={d.logo.url}
                alt={d.logo.alt || "Logo"}
                style={{ width: d.logo.width || "140px", maxHeight: "60px" }}
                className="object-contain"
              />
            </div>
          )}

          {/* Back Button */}
          {step.allowBack && currentStepIndex > 0 && (
            <button
              type="button"
              disabled={isEditor}
              onClick={onPrevStep}
              className="flex items-center gap-1.5 text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          )}

          {/* Step Component List */}
          {components.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border-2 border-dashed border-muted/50 rounded-lg">
              Etapa sem componentes. Arraste ou clique nos itens da biblioteca lateral para adicionar.
            </div>
          ) : (
            components.map((comp) => (
              <QuizComponentRenderer
                key={comp.id}
                component={comp}
                formValue={formValues[comp.id] || ""}
                selectedOptions={selectedOptions[comp.id] || []}
                primaryColor={d.primaryColor || "#6366f1"}
                borderRadius={borderRadius}
                validationError={validationErrors[comp.id]}
                isEditor={isEditor}
                isSelected={comp.id === activeComponentId}
                submitting={submitting}
                onFormChange={(val) => onFormChange?.(comp.id, val)}
                onOptionSelect={(optId, destination) => onOptionSelect?.(comp.id, optId, destination)}
                onNext={onNextStep}
                onSelectComponent={onSelectComponent}
                onDuplicateComponent={(id) => duplicateComponent(id)}
                onDeleteComponent={(id) => deleteComponent(id)}
                onMoveUp={(id) => handleMoveUp(id)}
                onMoveDown={(id) => handleMoveDown(id)}
              />
            ))
          )}
        </div>

        {/* Step Index Indicator Footer */}
        {totalSteps > 1 && (
          <div className="mt-6 text-center text-[11px] font-medium opacity-40">
            Etapa {currentStepIndex + 1} de {totalSteps}
          </div>
        )}
      </div>
    </div>
  );
};
