import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizComponent, QuizComponentType, FIELD_TYPES, useAllQuizComponents } from "@/hooks/useQuizComponents";
import { QuizStep, useQuizSteps } from "@/hooks/useQuizSteps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  field_phone: "Campo: Celular",
  field_number: "Campo: Número",
  field_textarea: "Campo: Mensagem",
  field_date: "Campo: Data",
  field_height: "Régua: Altura",
  field_weight: "Régua: Peso",
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
  const isField = FIELD_TYPES.includes(component.componentType);
  const isSlider = component.componentType === "field_height" || component.componentType === "field_weight";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-xs font-semibold truncate">{componentLabel[component.componentType]}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
          onClick={() => onDelete(component.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="componente" className="flex-1 flex flex-col min-h-0">
        <TabsList className="h-8 bg-transparent border-b rounded-none px-2 shrink-0 justify-start gap-0">
          {["componente", "aparencia", "exibicao"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="text-[11px] px-2 h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent capitalize"
            >
              {tab === "componente" ? "Componente" : tab === "aparencia" ? "Aparência" : "Exibição"}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Componente tab */}
        <TabsContent value="componente" className="flex-1 overflow-y-auto p-3 mt-0">
          {component.componentType === "text" && (
            <TextConfig config={component.config} onChange={handleChange} />
          )}
          {component.componentType === "image" && (
            <ImageConfig config={component.config} onChange={handleChange} />
          )}
          {component.componentType === "button" && (
            <ButtonConfig componentId={component.id} config={component.config} onChange={handleChange} steps={steps} />
          )}
          {component.componentType === "options" && (
            <OptionsConfig config={component.config} onChange={handleChange} steps={steps} />
          )}
          {isField && (
            <FieldConfig
              config={component.config}
              onChange={handleChange}
              componentType={component.componentType}
            />
          )}
        </TabsContent>

        {/* Aparência tab */}
        <TabsContent value="aparencia" className="flex-1 overflow-y-auto p-3 mt-0">
          <AppearanceConfig config={component.config} onChange={handleChange} hideLabel={isSlider} />
        </TabsContent>

        {/* Exibição tab */}
        <TabsContent value="exibicao" className="flex-1 overflow-y-auto p-3 mt-0">
          <DisplayConfig config={component.config} onChange={handleChange} funnelId={component.funnelId} currentComponentId={component.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Aparência ───────────────────────────────────────────────────────────────

function AppearanceConfig({ config, onChange, hideLabel }: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  hideLabel?: boolean;
}) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });

  return (
    <div className="space-y-3">
      {!hideLabel && (
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Select value={(config.labelStyle as string) || "default"} onValueChange={(v) => set("labelStyle", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrão</SelectItem>
              <SelectItem value="none">Nenhum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Alinhamento do texto</Label>
        <Select value={(config.textAlign as string) || "left"} onValueChange={(v) => set("textAlign", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">À esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">À direita</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Arredondamento</Label>
        <Select value={(config.borderRadius as string) || "inherit"} onValueChange={(v) => set("borderRadius", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">Herdar do tema</SelectItem>
            <SelectItem value="square">Quadrado</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="rounded">Arredondado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Largura</Label>
        <Select value={(config.width as string) || "100%"} onValueChange={(v) => set("width", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="100%">100%</SelectItem>
            <SelectItem value="80%">80%</SelectItem>
            <SelectItem value="50%">50%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Alinhamento</Label>
        <Select value={(config.alignment as string) || "left"} onValueChange={(v) => set("alignment", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Direita</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Exibição ────────────────────────────────────────────────────────────────

function DisplayConfig({ config, onChange, funnelId, currentComponentId }: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  funnelId: string;
  currentComponentId: string;
}) {
  const { data: allComponents = [] } = useAllQuizComponents(funnelId);
  const displayRules = (config.displayRules as any[]) || [];

  const referencableComponents = allComponents.filter(
    (c) => c.id !== currentComponentId && (c.componentType === "options" || FIELD_TYPES.includes(c.componentType))
  );

  const handleAddRule = () => {
    if (referencableComponents.length === 0) return;
    const newRule = {
      id: crypto.randomUUID(),
      fieldId: referencableComponents[0].id,
      operator: "equals",
      value: "",
    };
    onChange({ ...config, displayRules: [...displayRules, newRule] });
  };

  const handleRemoveRule = (id: string) => {
    onChange({ ...config, displayRules: displayRules.filter((r) => r.id !== id) });
  };

  const handleUpdateRule = (id: string, updates: Record<string, unknown>) => {
    onChange({
      ...config,
      displayRules: displayRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  const getComponentLabel = (c: any) => {
    const label = c.config.label || c.config.question || c.componentType;
    return label.replace(/<[^>]*>/g, "").substring(0, 30) || "Sem título";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Mostrar após (segundos)</Label>
        <Input
          type="number"
          min={0}
          placeholder="Imediato"
          value={(config.showAfterSeconds as number) || ""}
          onChange={(e) => onChange({ ...config, showAfterSeconds: e.target.value ? Number(e.target.value) : null })}
        />
        <p className="text-xs text-muted-foreground">Deixe vazio para exibir imediatamente.</p>
      </div>

      <div className="space-y-3">
        <Label>Regras de exibição (Condicionais)</Label>
        
        {displayRules.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Exibido sempre por padrão.</p>
        ) : (
          <div className="space-y-3">
            {displayRules.map((rule) => {
              const refComp = referencableComponents.find((c) => c.id === rule.fieldId);
              const refOptions = (refComp?.config.options as any[]) || [];

              return (
                <div key={rule.id} className="border p-2 rounded-md space-y-2 relative bg-muted/20">
                  <button
                    className="absolute top-1.5 right-1.5 text-destructive hover:text-destructive text-[10px]"
                    onClick={() => handleRemoveRule(rule.id)}
                  >
                    Excluir
                  </button>

                  <div className="space-y-1">
                    <Label className="text-[10px]">Se a pergunta...</Label>
                    <Select
                      value={rule.fieldId}
                      onValueChange={(val) => handleUpdateRule(rule.id, { fieldId: val, value: "" })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {referencableComponents.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {getComponentLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Condição</Label>
                      <Select
                        value={rule.operator}
                        onValueChange={(val) => handleUpdateRule(rule.id, { operator: val })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Igual a</SelectItem>
                          <SelectItem value="not_equals">Diferente de</SelectItem>
                          <SelectItem value="contains">Contém</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px]">Valor</Label>
                      {refComp?.componentType === "options" ? (
                        <Select
                          value={rule.value}
                          onValueChange={(val) => handleUpdateRule(rule.id, { value: val })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Escolha..." />
                          </SelectTrigger>
                          <SelectContent>
                            {refOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.value}>
                                {opt.text}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="h-7 text-xs"
                          placeholder="Valor..."
                          value={rule.value}
                          onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleAddRule}
          disabled={referencableComponents.length === 0}
        >
          {referencableComponents.length === 0 ? "Nenhuma outra pergunta disponível" : "+ Adicionar Regra"}
        </Button>
      </div>
    </div>
  );
}

// ─── StepSettingsPanel ───────────────────────────────────────────────────────

function StepSettingsPanel({ step, steps }: { step: QuizStep; steps: QuizStep[] }) {
  const { updateStep } = useQuizSteps(step.funnelId);
  const [name, setName] = useState(step.name);
  const [nameDebounce, setNameDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleNameChange = (v: string) => {
    setName(v);
    if (nameDebounce) clearTimeout(nameDebounce);
    setNameDebounce(setTimeout(() => updateStep({ id: step.id, updates: { name: v } }), 800));
  };

  const handleToggle = (field: "show_logo" | "show_progress" | "allow_back", value: boolean) => {
    updateStep({ id: step.id, updates: { [field]: value } });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b shrink-0">
        <span className="text-xs font-semibold">Propriedades da etapa</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label>Nome da etapa</Label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch checked={step.showLogo} onCheckedChange={(v) => handleToggle("show_logo", v)} />
            <Label>Mostrar logotipo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={step.showProgress} onCheckedChange={(v) => handleToggle("show_progress", v)} />
            <Label>Mostrar progresso</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={step.allowBack} onCheckedChange={(v) => handleToggle("allow_back", v)} />
            <Label>Permitir voltar</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
