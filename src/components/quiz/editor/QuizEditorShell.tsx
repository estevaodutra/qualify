import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Loader2, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuizFunnel, useQuizFunnels } from "@/hooks/useQuizFunnels";
import { useQuizSteps } from "@/hooks/useQuizSteps";
import { useQuizComponents, useAllQuizComponents } from "@/hooks/useQuizComponents";
import { StepList } from "./StepList";
import { ComponentPalette } from "./ComponentPalette";
import { MobilePreview } from "./MobilePreview";
import { ComponentConfigPanel } from "./ComponentConfigPanel";
import { ResponsesTable } from "../leads/ResponsesTable";
import { PerformanceTab } from "../leads/PerformanceTab";
import { DesignTab, DesignConfig, DEFAULT_DESIGN_CONFIG } from "../design/DesignTab";
import { QuizSettingsDialog } from "../QuizSettingsDialog";

interface Props {
  funnel: QuizFunnel;
}

export function QuizEditorShell({ funnel }: Props) {
  const navigate = useNavigate();
  const { publishFunnel, updateFunnel } = useQuizFunnels();

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const designConfig: DesignConfig = {
    ...DEFAULT_DESIGN_CONFIG,
    ...(funnel.designConfig as Partial<DesignConfig>),
  };

  const { steps, isLoading: stepsLoading, createStep, deleteStep, reorderSteps } = useQuizSteps(funnel.id);

  const activeStepId = selectedStepId || steps[0]?.id || null;
  const activeStep = steps.find((s) => s.id === activeStepId) || null;

  const { components, createComponent, updateComponent, deleteComponent, reorderComponents } =
    useQuizComponents(activeStepId || "", funnel.id);

  // All components across all steps — for PerformanceTab
  const { data: allComponents = [] } = useAllQuizComponents(funnel.id);

  const selectedComponent = components.find((c) => c.id === selectedComponentId) || null;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleComponentChange = useCallback(
    (id: string, config: Record<string, unknown>) => {
      setIsSaving(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateComponent({ id, config }).finally(() => setIsSaving(false));
      }, 800);
    },
    [updateComponent]
  );

  const designDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDesignChange = useCallback(
    (config: DesignConfig) => {
      setIsSaving(true);
      if (designDebounceRef.current) clearTimeout(designDebounceRef.current);
      designDebounceRef.current = setTimeout(() => {
        updateFunnel({ id: funnel.id, updates: { design_config: config as unknown as Record<string, unknown> } }).finally(() => setIsSaving(false));
      }, 800);
    },
    [funnel.id, updateFunnel]
  );

  const handleSettingsSave = async (
    field: "webhook_config" | "seo_config" | "pixel_config",
    value: Record<string, unknown>
  ) => {
    await updateFunnel({ id: funnel.id, updates: { [field]: value } });
  };

  const handleAddStep = async () => {
    const step = await createStep({ name: `Etapa ${steps.length + 1}`, stepOrder: steps.length });
    setSelectedStepId(step.id);
    setSelectedComponentId(null);
  };

  const handleDeleteStep = async (id: string) => {
    await deleteStep(id);
    if (selectedStepId === id) {
      setSelectedStepId(steps.find((s) => s.id !== id)?.id || null);
      setSelectedComponentId(null);
    }
  };

  const handleSelectStep = (id: string) => {
    setSelectedStepId(id);
    setSelectedComponentId(null);
  };

  const handleAddComponent = async (type: Parameters<typeof createComponent>[0]["componentType"]) => {
    if (!activeStepId) return;
    const comp = await createComponent({ componentType: type });
    setSelectedComponentId(comp.id);
  };

  const handleDeleteComponent = async (id: string) => {
    await deleteComponent(id);
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await publishFunnel({ id: funnel.id, publish: funnel.status !== "published" });
    setIsPublishing(false);
  };

  const isPublished = funnel.status === "published";

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quiz")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold leading-none">{funnel.name}</h1>
            <p className="text-xs text-muted-foreground">/q/{funnel.slug}</p>
          </div>
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "Publicado" : "Rascunho"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={isPublished ? "outline" : "default"}
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isPublished ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="construtor" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4 shrink-0">
          <TabsList className="h-9 bg-transparent p-0 gap-0">
            {[
              { value: "construtor", label: "Construtor" },
              { value: "design", label: "Design" },
              { value: "leads", label: "Leads" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-4 h-9"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Construtor tab */}
        <TabsContent value="construtor" className="flex-1 flex min-h-0 mt-0">
          {/* Left panel */}
          <div className="w-56 border-r flex flex-col shrink-0 min-h-0">
            <div className="flex-[1.2] border-b min-h-0 overflow-hidden flex flex-col">
              <StepList
                steps={steps}
                selectedStepId={activeStepId}
                onSelectStep={handleSelectStep}
                onAddStep={handleAddStep}
                onDeleteStep={handleDeleteStep}
                onReorder={reorderSteps}
              />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ComponentPalette onAdd={handleAddComponent} disabled={!activeStepId} />
            </div>
          </div>

          {/* Center: preview */}
          <div className="flex-1 min-h-0 overflow-hidden border-r">
            <MobilePreview
              step={activeStep}
              components={components}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
              designConfig={designConfig}
              stepIndex={steps.findIndex((s) => s.id === activeStepId)}
              totalSteps={steps.length}
            />
          </div>

          {/* Right: config */}
          <div className="w-64 shrink-0 min-h-0 overflow-hidden flex flex-col">
            <ComponentConfigPanel
              component={selectedComponent}
              activeStep={activeStep}
              steps={steps}
              onChange={handleComponentChange}
              onDelete={handleDeleteComponent}
            />
          </div>
        </TabsContent>

        {/* Design tab */}
        <TabsContent value="design" className="flex-1 overflow-y-auto mt-0">
          <DesignTab config={designConfig} onChange={handleDesignChange} />
        </TabsContent>

        {/* Leads tab with sub-tabs */}
        <TabsContent value="leads" className="flex-1 overflow-y-auto mt-0">
          <div className="p-6">
            <Tabs defaultValue="respostas">
              <TabsList className="mb-4">
                <TabsTrigger value="respostas">Respostas</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>
              <TabsContent value="respostas">
                <ResponsesTable funnelId={funnel.id} totalSteps={steps.length} />
              </TabsContent>
              <TabsContent value="performance">
                <PerformanceTab funnel={funnel} steps={steps} components={allComponents} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>

      {/* Settings dialog */}
      <QuizSettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        funnel={funnel}
        onSave={handleSettingsSave}
      />
    </div>
  );
}
