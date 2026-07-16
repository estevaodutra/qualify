// src/components/quiz/builder/QuizBuilderShell.tsx
import React, { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";
import { QuizBuilderTopbar } from "./QuizBuilderTopbar";
import { StepSidebar } from "./StepSidebar";
import { ComponentLibrary } from "./ComponentLibrary";
import { BuilderCanvas } from "./BuilderCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { QuizSettingsOverlay } from "../settings/QuizSettingsOverlay";
import { QuizFunnel, QuizStep, QuizComponent, QuizDesignConfig } from "@/types/quiz";
import { DEFAULT_DESIGN_CONFIG } from "@/components/quiz/design/DesignTab";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface QuizBuilderShellProps {
  funnelId: string;
}

export const QuizBuilderShell: React.FC<QuizBuilderShellProps> = ({ funnelId }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const funnel = useQuizBuilderStore((s) => s.funnel);
  const steps = useQuizBuilderStore((s) => s.steps);
  const components = useQuizBuilderStore((s) => s.components);
  const designConfig = useQuizBuilderStore((s) => s.designConfig);
  const activeComponentId = useQuizBuilderStore((s) => s.activeComponentId);

  const setFunnel = useQuizBuilderStore((s) => s.setFunnel);
  const setSteps = useQuizBuilderStore((s) => s.setSteps);
  const setComponents = useQuizBuilderStore((s) => s.setComponents);
  const setSaveStatus = useQuizBuilderStore((s) => s.setSaveStatus);
  const undo = useQuizBuilderStore((s) => s.undo);
  const redo = useQuizBuilderStore((s) => s.redo);
  const deleteComponent = useQuizBuilderStore((s) => s.deleteComponent);
  const saveStatus = useQuizBuilderStore((s) => s.saveStatus);

  // Load Funnel, Steps and Components from Supabase
  useEffect(() => {
    async function loadData() {
      const { data: f } = await (supabase as any)
        .from("quiz_funnels")
        .select("*")
        .eq("id", funnelId)
        .single();

      if (!f) return;

      const [{ data: sList }, { data: cList }] = await Promise.all([
        (supabase as any)
          .from("quiz_steps")
          .select("*")
          .eq("funnel_id", funnelId)
          .order("step_order", { ascending: true }),
        (supabase as any)
          .from("quiz_components")
          .select("*")
          .eq("funnel_id", funnelId)
          .order("component_order", { ascending: true }),
      ]);

      const loadedDesignConfig: QuizDesignConfig = {
        ...DEFAULT_DESIGN_CONFIG,
        ...(f.design_config || {}),
      };

      const formattedFunnel: QuizFunnel = {
        id: f.id,
        companyId: f.company_id,
        userId: f.user_id,
        name: f.name,
        slug: f.slug,
        status: f.status,
        designConfig: loadedDesignConfig,
        seoConfig: f.seo_config || {},
        pixelConfig: f.pixel_config || {},
        webhookConfig: f.webhook_config || {},
        visitsCount: f.visits_count || 0,
        responsesCount: f.responses_count || 0,
        leadsCount: f.leads_count || 0,
        completionsCount: f.completions_count || 0,
        version: f.version || 1,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      };

      const formattedSteps: QuizStep[] = (sList || []).map((s: any) => ({
        id: s.id,
        funnelId: s.funnel_id,
        name: s.name,
        stepOrder: s.step_order,
        type: s.type || "content",
        showLogo: s.show_logo ?? true,
        showProgress: s.show_progress ?? true,
        allowBack: s.allow_back ?? true,
        settings: s.settings || {},
      }));

      // Auto-create initial default step if funnel is empty
      if (formattedSteps.length === 0) {
        const defaultStepId = crypto.randomUUID();
        const defaultStep: QuizStep = {
          id: defaultStepId,
          funnelId: f.id,
          name: "Etapa 1",
          stepOrder: 0,
          type: "content",
          showLogo: true,
          showProgress: true,
          allowBack: true,
        };
        formattedSteps.push(defaultStep);

        const { data: authData } = await supabase.auth.getUser();
        const effectiveUser = f.user_id || authData.user?.id;

        await (supabase as any).from("quiz_steps").insert({
          id: defaultStepId,
          funnel_id: f.id,
          user_id: effectiveUser,
          name: defaultStep.name,
          step_order: 0,
          show_logo: true,
          show_progress: true,
          allow_back: true,
        });
      }

      const formattedComponents: QuizComponent[] = (cList || []).map((c: any) => ({
        id: c.id,
        stepId: c.step_id,
        funnelId: c.funnel_id,
        componentType: c.component_type,
        componentOrder: c.component_order,
        config: c.config || {},
        schemaVersion: c.schema_version || 1,
      }));

      setFunnel(formattedFunnel);
      setSteps(formattedSteps);
      setComponents(formattedComponents);
      setSaveStatus("saved");
    }

    loadData();
  }, [funnelId]);

  // Persist Changes to Supabase
  const handleSave = useCallback(async () => {
    if (!funnel) return;

    setSaveStatus("saving");
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || funnel.userId;

      // 1. Update Funnel
      const { error: fErr } = await (supabase as any)
        .from("quiz_funnels")
        .update({
          design_config: designConfig || funnel.designConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", funnel.id);

      if (fErr) throw fErr;

      // 2. Upsert Steps
      for (const st of steps) {
        const { error: sErr } = await (supabase as any).from("quiz_steps").upsert({
          id: st.id,
          funnel_id: funnel.id,
          user_id: userId,
          name: st.name,
          step_order: st.stepOrder,
          show_logo: st.showLogo,
          show_progress: st.showProgress,
          allow_back: st.allowBack,
        });

        if (sErr) throw sErr;
      }

      // 3. Clean Deleted Components
      const currentCompIds = components.map((c) => c.id);
      if (currentCompIds.length > 0) {
        await (supabase as any)
          .from("quiz_components")
          .delete()
          .eq("funnel_id", funnel.id)
          .not("id", "in", `(${currentCompIds.join(",")})`);
      } else {
        await (supabase as any)
          .from("quiz_components")
          .delete()
          .eq("funnel_id", funnel.id);
      }

      // 4. Upsert Components
      for (const comp of components) {
        const { error: cErr } = await (supabase as any).from("quiz_components").upsert({
          id: comp.id,
          step_id: comp.stepId,
          funnel_id: funnel.id,
          user_id: userId,
          component_type: comp.componentType,
          component_order: comp.componentOrder,
          config: comp.config,
          schema_version: comp.schemaVersion,
        });

        if (cErr) throw cErr;
      }

      setSaveStatus("saved");
      toast({ title: "Funil salvo com sucesso!" });
    } catch (e: any) {
      setSaveStatus("error");
      toast({ title: "Erro ao salvar", description: e.message || "Erro ao conectar com o banco de dados.", variant: "destructive" });
    }
  }, [funnel, steps, components, designConfig, saveStatus]);

  // Auto-save only on exit
  const handleExit = useCallback(async () => {
    if (saveStatus === "dirty") {
      await handleSave();
    }
    navigate("/quiz");
  }, [saveStatus, handleSave, navigate]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" && activeComponentId) {
        deleteComponent(activeComponentId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, activeComponentId, deleteComponent]);

  const handlePublish = async () => {
    if (!funnel) return;
    await handleSave();
    const { error } = await (supabase as any)
      .from("quiz_funnels")
      .update({ status: "published" })
      .eq("id", funnel.id);

    if (error) {
      toast({ title: "Erro ao publicar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Funil Publicado!", description: `Disponível em /q/${funnel.slug}` });
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      <QuizBuilderTopbar
        onSave={handleSave}
        onPublish={handlePublish}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExit={handleExit}
      />
      <div className="flex-1 flex overflow-hidden relative">
        <StepSidebar />
        <ComponentLibrary />
        <BuilderCanvas />
        <PropertiesPanel />
      </div>

      {/* Settings Overlay Fullscreen */}
      {isSettingsOpen && (
        <QuizSettingsOverlay
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};
