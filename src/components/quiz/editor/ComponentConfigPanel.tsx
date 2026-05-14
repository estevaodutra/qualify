import { useState } from "react";
import { Trash2 } from "lucide-react";
import { QuizComponent, QuizComponentType } from "@/hooks/useQuizComponents";
import { QuizStep, useQuizSteps } from "@/hooks/useQuizSteps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TextConfig } from "./config/TextConfig";
import { ImageConfig } from "./config/ImageConfig";
import { ButtonConfig } from "./config/ButtonConfig";
import { OptionsConfig } from "./config/OptionsConfig";
import { FieldConfig } from "./config/FieldConfig";

const componentLabel: Record<QuizComponentType, string> = {
  text: "Texto",
  image: "Imagem",
  button: "Botão",
  options: "Quiz / Opções",
  field_name: "Campo: Nome",
  field_email: "Campo: E-mail",
  field_phone: "Campo: Telefone",
};

interface Props {
  component: QuizComponent | null;
  activeStep: QuizStep | null;
  steps: QuizStep[];
  onChange: (id: string, config: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

export function ComponentConfigPanel({ component, activeStep, steps, onChange, onDelete }: Props) {
  if (!component && !activeStep) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
        Selecione uma etapa ou componente para editar.
      </div>
    );
  }

  if (!component && activeStep) {
    return <StepSettingsPanel step={activeStep} steps={steps} />;
  }

  if (!component) return null;

  const handleChange = (config: Record<string, unknown>) => onChange(component.id, config);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold">{componentLabel[component.componentType]}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => onDelete(component.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {component.componentType === "text" && (
          <TextConfig config={component.config} onChange={handleChange} />
        )}
        {component.componentType === "image" && (
          <ImageConfig config={component.config} onChange={handleChange} />
        )}
        {component.componentType === "button" && (
          <ButtonConfig config={component.config} onChange={handleChange} steps={steps} />
        )}
        {component.componentType === "options" && (
          <OptionsConfig config={component.config} onChange={handleChange} steps={steps} />
        )}
        {(component.componentType === "field_name" ||
          component.componentType === "field_email" ||
          component.componentType === "field_phone") && (
          <FieldConfig config={component.config} onChange={handleChange} />
        )}
      </div>
    </div>
  );
}

function StepSettingsPanel({ step, steps }: { step: QuizStep; steps: QuizStep[] }) {
  const { updateStep } = useQuizSteps(step.funnelId);
  const [name, setName] = useState(step.name);
  const [nameDebounce, setNameDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleNameChange = (v: string) => {
    setName(v);
    if (nameDebounce) clearTimeout(nameDebounce);
    setNameDebounce(
      setTimeout(() => {
        updateStep({ id: step.id, updates: { name: v } });
      }, 800)
    );
  };

  const handleToggle = (field: "show_logo" | "show_progress" | "allow_back", value: boolean) => {
    updateStep({ id: step.id, updates: { [field]: value } });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b">
        <span className="text-xs font-semibold">Propriedades da etapa</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label>Nome da etapa</Label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={step.showLogo}
              onCheckedChange={(v) => handleToggle("show_logo", v)}
            />
            <Label>Mostrar logotipo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={step.showProgress}
              onCheckedChange={(v) => handleToggle("show_progress", v)}
            />
            <Label>Mostrar progresso</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={step.allowBack}
              onCheckedChange={(v) => handleToggle("allow_back", v)}
            />
            <Label>Permitir voltar</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
