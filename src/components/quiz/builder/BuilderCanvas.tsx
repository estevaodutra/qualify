// src/components/quiz/builder/BuilderCanvas.tsx
import React from "react";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";
import { QuizStepRenderer } from "../renderer/QuizStepRenderer";
import { DEFAULT_DESIGN_CONFIG } from "@/components/quiz/design/DesignTab";

export const BuilderCanvas: React.FC = () => {
  const steps = useQuizBuilderStore((s) => s.steps);
  const components = useQuizBuilderStore((s) => s.components);
  const activeStepId = useQuizBuilderStore((s) => s.activeStepId);
  const activeComponentId = useQuizBuilderStore((s) => s.activeComponentId);
  const setActiveComponentId = useQuizBuilderStore((s) => s.setActiveComponentId);
  const deviceMode = useQuizBuilderStore((s) => s.deviceMode);
  const designConfig = useQuizBuilderStore((s) => s.designConfig);

  const activeStepIndex = steps.findIndex((s) => s.id === activeStepId);
  const activeStep = steps[activeStepIndex] || steps[0];
  const stepComponents = components.filter((c) => c.stepId === activeStep?.id);

  const d = designConfig || DEFAULT_DESIGN_CONFIG;

  const getViewportWidth = () => {
    switch (deviceMode) {
      case "mobile":
        return "375px";
      case "tablet":
        return "768px";
      case "desktop":
        return "100%";
      default:
        return "375px";
    }
  };

  const canvasBackground = d.backgroundColor || "#f8fafc";

  return (
    <div
      onClick={() => setActiveComponentId(null)}
      style={{ backgroundColor: canvasBackground }}
      className="flex-1 overflow-y-auto p-8 flex items-start justify-center relative select-none transition-colors duration-300"
    >
      <div
        style={{ width: getViewportWidth() }}
        className="transition-all duration-300 shadow-xl rounded-xl border border-border overflow-hidden bg-card"
      >
        {activeStep ? (
          <QuizStepRenderer
            step={activeStep}
            components={stepComponents}
            designConfig={d as any}
            currentStepIndex={activeStepIndex >= 0 ? activeStepIndex : 0}
            totalSteps={steps.length}
            formValues={{}}
            selectedOptions={{}}
            validationErrors={{}}
            isEditor={true}
            activeComponentId={activeComponentId}
            onSelectComponent={(id) => setActiveComponentId(id)}
          />
        ) : (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Nenhuma etapa cadastrada neste funil.
          </div>
        )}
      </div>
    </div>
  );
};
