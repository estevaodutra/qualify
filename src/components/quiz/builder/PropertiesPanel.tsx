// src/components/quiz/builder/PropertiesPanel.tsx
import React from "react";
import { Sliders, Palette, LayoutGrid, Eye, Play, GitBranch, Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuizBuilderStore, InspectorTab } from "@/stores/quiz/useQuizBuilderStore";
import { COMPONENT_REGISTRY } from "../registry/componentRegistry";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";
import { TEXT_COLOR_PRESETS } from "@/utils/quiz/quizTextSanitizer";
import { ImageUploader } from "../media/ImageUploader";
import { EditableRichText } from "../editor/EditableRichText";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  defaultColor?: string;
}

const ColorPickerPopover: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  defaultColor = "#ec4899",
}) => {
  const currentColor = value || defaultColor;

  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full border border-border rounded-md p-1.5 bg-background h-8 text-xs hover:border-indigo-400 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-4 h-4 rounded border border-border/80 shrink-0 shadow-xs"
                style={{ backgroundColor: currentColor }}
              />
              <span className="font-mono text-[10px] uppercase truncate">{currentColor}</span>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3 text-xs space-y-3" side="top">
          <p className="font-semibold text-xs text-foreground/80">{label}</p>

          <div className="grid grid-cols-6 gap-1.5">
            {TEXT_COLOR_PRESETS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onChange(item.value || defaultColor)}
                title={item.label}
                className={`w-6 h-6 rounded-full border border-border flex items-center justify-center hover:scale-110 transition-transform ${
                  item.value && item.value.toLowerCase() === currentColor.toLowerCase()
                    ? "ring-2 ring-indigo-600 ring-offset-1"
                    : ""
                }`}
                style={{ backgroundColor: item.value || "#ffffff" }}
              >
                {!item.value && <X className="w-3 h-3 text-red-500" />}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-border/60">
            <span className="text-[10px] text-muted-foreground">Personalizada:</span>
            <input
              type="color"
              value={currentColor.startsWith("#") ? currentColor : "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
            <span className="font-mono text-[10px] uppercase">{currentColor}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-[11px]"
            onClick={() => onChange(defaultColor)}
          >
            Restaurar Padrão
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface WidthSliderProps {
  value: string;
  onChange: (val: string) => void;
}

const WidthSliderControl: React.FC<WidthSliderProps> = ({ value, onChange }) => {
  const numericVal = parseInt(value || "100", 10) || 100;

  const updateVal = (newVal: number) => {
    const clamped = Math.max(10, Math.min(100, newVal));
    onChange(`${clamped}%`);
  };

  return (
    <div className="relative border border-border rounded-xl p-3 bg-card shadow-sm space-y-2 select-none">
      <span className="absolute -top-2.5 left-3 bg-card px-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
        Largura
      </span>
      <div className="flex items-center justify-between text-xs font-bold pt-1 px-1">
        <button
          type="button"
          onClick={() => updateVal(numericVal - 5)}
          className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center text-foreground font-bold text-sm transition-colors"
          title="Diminuir (-5%)"
        >
          −
        </button>
        <span className="text-sky-600 dark:text-sky-400 font-bold text-xs">{numericVal}%</span>
        <button
          type="button"
          onClick={() => updateVal(numericVal + 5)}
          className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center text-foreground font-bold text-sm transition-colors"
          title="Aumentar (+5%)"
        >
          +
        </button>
      </div>
      <div className="px-1">
        <input
          type="range"
          min={10}
          max={100}
          step={1}
          value={numericVal}
          onChange={(e) => updateVal(Number(e.target.value))}
          className="w-full accent-sky-500 cursor-pointer h-2 bg-muted rounded-lg"
        />
      </div>
    </div>
  );
};

export const PropertiesPanel: React.FC = () => {
  const activeComponentId = useQuizBuilderStore((s) => s.activeComponentId);
  const activeStepId = useQuizBuilderStore((s) => s.activeStepId);
  const components = useQuizBuilderStore((s) => s.components);
  const steps = useQuizBuilderStore((s) => s.steps);
  const activeTab = useQuizBuilderStore((s) => s.activeTab);
  const setActiveTab = useQuizBuilderStore((s) => s.setActiveTab);
  const updateComponent = useQuizBuilderStore((s) => s.updateComponent);
  const deleteComponent = useQuizBuilderStore((s) => s.deleteComponent);
  const updateStep = useQuizBuilderStore((s) => s.updateStep);

  const activeComponent = components.find((c) => c.id === activeComponentId);
  const activeStep = steps.find((s) => s.id === activeStepId);

  // If no component selected, show Step Properties
  if (!activeComponent) {
    if (!activeStep) {
      return (
        <div className="w-80 bg-card border-l border-border p-4 text-center text-xs text-muted-foreground flex items-center justify-center shrink-0">
          Selecione um elemento ou etapa para personalizar.
        </div>
      );
    }

    return (
      <div className="w-80 bg-card border-l border-border flex flex-col h-full shrink-0 select-none">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-xs uppercase tracking-wide">Configurações da Etapa</span>
        </div>
        <div className="p-4 space-y-4 text-xs overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da Etapa</Label>
            <Input
              value={activeStep.name}
              onChange={(e) => updateStep(activeStep.id, { name: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeStep.showLogo}
                onChange={(e) => updateStep(activeStep.id, { showLogo: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span>Exibir Logotipo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeStep.showProgress}
                onChange={(e) => updateStep(activeStep.id, { showProgress: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span>Exibir Barra de Progresso</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeStep.allowBack}
                onChange={(e) => updateStep(activeStep.id, { allowBack: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span>Permitir Botão Voltar</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  const def = COMPONENT_REGISTRY[activeComponent.componentType];

  const handleConfigChange = (key: string, value: any) => {
    updateComponent(activeComponent.id, {
      config: {
        ...activeComponent.config,
        [key]: value,
      },
    });
  };

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-xs truncate">{def?.label || activeComponent.componentType}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-rose-500 hover:bg-rose-50"
          onClick={() => deleteComponent(activeComponent.id)}
          title="Excluir Elemento"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InspectorTab)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-5 h-9 p-1 bg-muted/50 border-b border-border rounded-none">
          <TabsTrigger value="content" className="text-[10px] p-0" title="Conteúdo">
            <Sliders className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="style" className="text-[10px] p-0" title="Estilo">
            <Palette className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="spacing" className="text-[10px] p-0" title="Espaçamento">
            <LayoutGrid className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="responsive" className="text-[10px] p-0" title="Responsividade">
            <Eye className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="data" className="text-[10px] p-0" title="Variáveis CRM">
            <Database className="w-3.5 h-3.5" />
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4 m-0">
            {activeComponent.componentType === "rich_text" || activeComponent.componentType === "text" || activeComponent.componentType === "heading" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Conteúdo de Texto (Edição Visual)</Label>
                  <EditableRichText
                    value={(activeComponent.config.content as string) || ""}
                    onChange={(val) => handleConfigChange("content", val)}
                    editable={true}
                    preset="full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Alinhamento do Bloco</Label>
                  <select
                    value={(activeComponent.config.alignment as string) || (activeComponent.config.align as string) || "center"}
                    onChange={(e) => handleConfigChange("alignment", e.target.value)}
                    className="w-full h-8 px-2 border rounded-md text-xs bg-background"
                  >
                    <option value="left">Esquerda</option>
                    <option value="center">Centralizado</option>
                    <option value="right">Direita</option>
                  </select>
                </div>
              </div>
            ) : null}

            {activeComponent.componentType === "image" || activeComponent.componentType === "logo" ? (
              <div className="space-y-4">
                <ImageUploader
                  label="Upload de Foto / Logo"
                  value={(activeComponent.config.url as string) || ""}
                  onChange={(url) => handleConfigChange("url", url)}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs">URL da Imagem (ou cole o link)</Label>
                  <Input
                    value={(activeComponent.config.url as string) || ""}
                    onChange={(e) => handleConfigChange("url", e.target.value)}
                    placeholder="https://exemplo.com/imagem.png"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Texto Alternativo (Alt)</Label>
                  <Input
                    value={(activeComponent.config.alt as string) || ""}
                    onChange={(e) => handleConfigChange("alt", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ) : null}

            {activeComponent.componentType === "button" || activeComponent.componentType === "cta_whatsapp" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Texto do Botão</Label>
                  <Input
                    value={(activeComponent.config.text as string) || ""}
                    onChange={(e) => handleConfigChange("text", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Colors with Swatch Palette Popover */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <ColorPickerPopover
                    label="Cor do Botão"
                    value={(activeComponent.config.buttonColor as string) || ""}
                    onChange={(color) => handleConfigChange("buttonColor", color)}
                    defaultColor="#ec4899"
                  />
                  <ColorPickerPopover
                    label="Cor do Texto"
                    value={(activeComponent.config.textColor as string) || ""}
                    onChange={(color) => handleConfigChange("textColor", color)}
                    defaultColor="#ffffff"
                  />
                </div>

                {/* Navigation Type Box */}
                <div className="relative border border-border/80 rounded-xl p-3 bg-card shadow-xs space-y-3 pt-4 select-none">
                  <span className="absolute -top-2.5 left-3 bg-card px-1.5 text-[11px] font-semibold text-primary">
                    Tipo de navegação
                  </span>

                  <select
                    value={(activeComponent.config.actionType as string) || "navigate"}
                    onChange={(e) => handleConfigChange("actionType", e.target.value)}
                    className="w-full h-8 px-2 border rounded-md text-xs bg-background"
                  >
                    <option value="navigate">Navegar entre etapas</option>
                    <option value="redirect">Redirecionar</option>
                  </select>

                  {activeComponent.config.actionType === "redirect" ? (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                      <div className="relative border border-border rounded-xl p-2.5 bg-background shadow-xs">
                        <span className="absolute -top-2.5 left-2 bg-background px-1 text-[10px] font-medium text-muted-foreground">
                          Destino do redirecionamento
                        </span>
                        <Input
                          value={(activeComponent.config.redirectUrl as string) || ""}
                          onChange={(e) => handleConfigChange("redirectUrl", e.target.value)}
                          placeholder="URL"
                          className="h-7 text-xs border-0 focus-visible:ring-0 p-0 shadow-none bg-transparent"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!activeComponent.config.openInNewTab}
                          onChange={(e) => handleConfigChange("openInNewTab", e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className="text-xs">Nova aba?</span>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                      <Label className="text-xs">Etapa de destino</Label>
                      <select
                        value={(activeComponent.config.targetStepId as string) || ""}
                        onChange={(e) => handleConfigChange("targetStepId", e.target.value)}
                        className="w-full h-8 px-2 border rounded-md text-xs bg-background"
                      >
                        <option value="">Próxima Etapa (Padrão)</option>
                        {steps.map((st, idx) => (
                          <option key={st.id} value={st.id}>
                            {st.name || `Etapa ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={!!activeComponent.config.animated}
                    onChange={(e) => handleConfigChange("animated", e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-xs">Efeito Pulsante de Atenção</span>
                </label>
              </div>
            ) : null}

            {activeComponent.componentType === "options" || activeComponent.componentType === "cards_choice" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Título da Pergunta</Label>
                  <Input
                    value={(activeComponent.config.question as string) || ""}
                    onChange={(e) => handleConfigChange("question", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!activeComponent.config.multiple}
                    onChange={(e) => handleConfigChange("multiple", e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Permitir Escolha Múltipla</span>
                </label>
              </div>
            ) : null}

            {activeComponent.componentType.startsWith("field_") ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Rótulo do Campo (Label)</Label>
                  <Input
                    value={(activeComponent.config.label as string) || ""}
                    onChange={(e) => handleConfigChange("label", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Placeholder</Label>
                  <Input
                    value={(activeComponent.config.placeholder as string) || ""}
                    onChange={(e) => handleConfigChange("placeholder", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {activeComponent.componentType === "field_phone" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Máscara</Label>
                    <select
                      value={(activeComponent.config.mask as string) || "(99) 99999-9999"}
                      onChange={(e) => handleConfigChange("mask", e.target.value)}
                      className="w-full h-8 px-2 border rounded-md text-xs bg-background"
                    >
                      <option value="(99) 99999-9999">(99) 99999-9999</option>
                      <option value="+55 (99) 99999-9999">+55 (99) 99999-9999 → Brasil</option>
                      <option value="+1 (999) 999-9999">+1 (999) 999-9999 → Estados Unidos</option>
                      <option value="+99 999 999 999">+99 999 999 999 → Europa</option>
                      <option value="no_mask">Sem Máscara</option>
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={!!activeComponent.config.required}
                    onChange={(e) => handleConfigChange("required", e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Campo Obrigatório</span>
                </label>
              </div>
            ) : null}
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-3 m-0">
            <div className="space-y-1.5">
              <Label className="text-xs">Alinhamento</Label>
              <select
                value={(activeComponent.config.align as string) || (activeComponent.config.alignment as string) || "center"}
                onChange={(e) => {
                  handleConfigChange("align", e.target.value);
                  handleConfigChange("alignment", e.target.value);
                }}
                className="w-full h-8 px-2 border rounded-md text-xs bg-background"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centralizado</option>
                <option value="right">Direita</option>
              </select>
            </div>
          </TabsContent>

          {/* Spacing Tab */}
          <TabsContent value="spacing" className="space-y-3 m-0 pt-2">
            <WidthSliderControl
              value={(activeComponent.config.width as string) || "100%"}
              onChange={(val) => handleConfigChange("width", val)}
            />
          </TabsContent>

          {/* Responsive Tab */}
          <TabsContent value="responsive" className="space-y-3 m-0">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!activeComponent.responsiveConfig?.hideOnMobile}
                onChange={(e) =>
                  updateComponent(activeComponent.id, {
                    responsiveConfig: { ...activeComponent.responsiveConfig, hideOnMobile: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>Ocultar em Dispositivos Mobile</span>
            </label>
          </TabsContent>

          {/* Data CRM Tab */}
          <TabsContent value="data" className="space-y-3 m-0">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da Variável CRM</Label>
              <Input
                value={(activeComponent.config.variableName as string) || ""}
                onChange={(e) => handleConfigChange("variableName", e.target.value)}
                placeholder="ex: nome, email, objetivo"
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Nome da chave associada no lead e webhook do CRM.</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
