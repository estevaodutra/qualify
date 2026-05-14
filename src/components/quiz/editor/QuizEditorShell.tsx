import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Loader2, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { QuizFunnel, useQuizFunnels } from "@/hooks/useQuizFunnels";
import { useQuizSteps } from "@/hooks/useQuizSteps";
import { useQuizComponents, useAllQuizComponents, QuizComponent } from "@/hooks/useQuizComponents";
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
  const queryClient = useQueryClient();
  const { publishFunnel, updateFunnel } = useQuizFunnels();

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [unsavedComponents, setUnsavedComponents] = useState<Record<string, Record<string, unknown>>>({});
  const [unsavedDesign, setUnsavedDesign] = useState<Partial<DesignConfig>>({});

  const hasUnsavedChanges = Object.keys(unsavedComponents).length > 0 || Object.keys(unsavedDesign).length > 0;

  const designConfig: DesignConfig = {
    ...DEFAULT_DESIGN_CONFIG,
    ...(funnel.designConfig as Partial<DesignConfig>),
    ...unsavedDesign,
  };

  const { steps, isLoading: stepsLoading, createStep, deleteStep, reorderSteps } = useQuizSteps(funnel.id);

  const activeStepId = selectedStepId || steps[0]?.id || null;
  const activeStep = steps.find((s) => s.id === activeStepId) || null;

  const { components, createComponent, updateComponent, deleteComponent, reorderComponents } =
    useQuizComponents(activeStepId || "", funnel.id);

  // All components across all steps — for PerformanceTab
  const { data: allComponents = [] } = useAllQuizComponents(funnel.id);

  const selectedComponent = components.find((c) => c.id === selectedComponentId) || null;

  const handleComponentChange = useCallback(
    (id: string, config: Record<string, unknown>) => {
      setUnsavedComponents(prev => ({ ...prev, [id]: config }));
      
      // Update cache immediately so the UI (MobilePreview) reflects it
      queryClient.setQueryData(["quiz_components", activeStepId], (old: QuizComponent[] | undefined) => 
        old?.map(c => c.id === id ? { ...c, config } : c)
      );
    },
    [queryClient, activeStepId]
  );

  const handleDesignChange = useCallback(
    (config: DesignConfig) => {
      setUnsavedDesign(config);
    },
    []
  );

  const handleSaveAll = async () => {
    if (!hasUnsavedChanges) return;
    setIsSaving(true);
    try {
      const promises: Promise<any>[] = Object.entries(unsavedComponents).map(([id, config]) =>
        updateComponent({ id, config })
      );
      if (Object.keys(unsavedDesign).length > 0) {
        promises.push(updateFunnel({ id: funnel.id, updates: { design_config: unsavedDesign as any } }));
      }
      await Promise.all(promises);
      setUnsavedComponents({});
      setUnsavedDesign({});
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  const handleDuplicateComponent = async (component: QuizComponent) => {
    if (!activeStepId) return;
    const comp = await createComponent({ componentType: component.componentType, config: component.config });
    setSelectedComponentId(comp.id);
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
          <Button variant="ghost" size="icon" onClick={() => {
            if (hasUnsavedChanges) {
              handleSaveAll().then(() => navigate("/quiz"));
            } else {
              navigate("/quiz");
            }
          }}>
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
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mr-2">
              <Loader2 className="w-3 h-3 animate-spin" />
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={hasUnsavedChanges ? "default" : "secondary"}
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar"}
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
          {/* Panel: Etapas */}
          <div className="w-48 border-r flex flex-col shrink-0 min-h-0 bg-muted/10">
            <StepList
              steps={steps}
              selectedStepId={activeStepId}
              onSelectStep={handleSelectStep}
              onAddStep={handleAddStep}
              onDeleteStep={handleDeleteStep}
              onReorder={reorderSteps}
            />
          </div>

          {/* Panel: Componentes */}
          <div className="w-56 border-r flex flex-col shrink-0 min-h-0">
            <ComponentPalette onAdd={handleAddComponent} disabled={!activeStepId} />
          </div>

          {/* Center: preview */}
          <div className="flex-1 min-h-0 overflow-hidden border-r">
            <MobilePreview
              step={activeStep}
              components={components}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
              onDeleteComponent={handleDeleteComponent}
              onDuplicateComponent={handleDuplicateComponent}
              onReorderComponents={reorderComponents}
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
