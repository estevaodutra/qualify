// src/pages/public/QuizPublicPage.tsx
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuizStepRenderer } from "@/components/quiz/renderer/QuizStepRenderer";
import { QuizFunnel, QuizStep, QuizComponent, QuizDesignConfig } from "@/types/quiz";

const DEFAULT_DESIGN: QuizDesignConfig = {
  primaryColor: "#6366f1",
  secondaryColor: "#4f46e5",
  accentColor: "#10b981",
  backgroundType: "solid",
  backgroundColor: "#f8fafc",
  textColor: "#0f172a",
  headingColor: "#0f172a",
  mutedTextColor: "#64748b",
  successColor: "#10b981",
  warningColor: "#f59e0b",
  errorColor: "#ef4444",
  fontFamily: "Inter",
  baseFontSize: 16,
  headingScale: 1.25,
  lineHeight: 1.5,
  pageMaxWidth: 640,
  contentMaxWidth: 540,
  minHeight: "100vh",
  verticalAlignment: "top",
  pagePaddingDesktop: 32,
  pagePaddingMobile: 16,
  componentGap: 16,
  borderRadius: "12px",
  inputBorderRadius: "8px",
  buttonBorderRadius: "10px",
  inputBackgroundColor: "#ffffff",
  inputBorderColor: "#cbd5e1",
  inputTextColor: "#0f172a",
  inputPlaceholderColor: "#94a3b8",
  inputFocusColor: "#6366f1",
  cardEnabled: true,
  cardBackgroundColor: "#ffffff",
  cardBorderColor: "#e2e8f0",
  cardShadow: "md",
  cardPadding: 24,
  logo: { width: "140px", alignment: "center", showLogo: true },
  progress: { style: "line", color: "#6366f1", trackColor: "#e2e8f0", height: 6, position: "top" },
};

function getOrCreateSessionId(): string {
  const key = "quiz_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function maskPhone(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

export default function QuizPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<QuizFunnel | null>(null);
  const [steps, setSteps] = useState<QuizStep[]>([]);
  const [components, setComponents] = useState<QuizComponent[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const accumulatedLead = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!slug) return;

    async function loadPublicData() {
      const { data: dbFunnel } = await (supabase as any)
        .from("quiz_funnels")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (!dbFunnel) {
        setLoading(false);
        return;
      }

      const [{ data: dbSteps }, { data: dbComponents }] = await Promise.all([
        (supabase as any)
          .from("quiz_steps")
          .select("*")
          .eq("funnel_id", dbFunnel.id)
          .order("step_order", { ascending: true }),
        (supabase as any)
          .from("quiz_components")
          .select("*")
          .eq("funnel_id", dbFunnel.id)
          .order("component_order", { ascending: true }),
      ]);

      const formattedFunnel: QuizFunnel = {
        id: dbFunnel.id,
        companyId: dbFunnel.company_id,
        userId: dbFunnel.user_id,
        name: dbFunnel.name,
        slug: dbFunnel.slug,
        status: dbFunnel.status,
        designConfig: { ...DEFAULT_DESIGN, ...(dbFunnel.design_config || {}) },
        seoConfig: dbFunnel.seo_config || {},
        pixelConfig: dbFunnel.pixel_config || {},
        webhookConfig: dbFunnel.webhook_config || {},
        visitsCount: dbFunnel.visits_count || 0,
        responsesCount: dbFunnel.responses_count || 0,
        leadsCount: dbFunnel.leads_count || 0,
        completionsCount: dbFunnel.completions_count || 0,
        version: dbFunnel.version || 1,
        createdAt: dbFunnel.created_at,
        updatedAt: dbFunnel.updated_at,
      };

      const formattedSteps: QuizStep[] = (dbSteps || []).map((s: any) => ({
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

      const formattedComponents: QuizComponent[] = (dbComponents || []).map((c: any) => ({
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

      // Record Visit & Setup Pixels
      await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: formattedFunnel.id, p_field: "visits" });
      setLoading(false);
    }

    loadPublicData();
  }, [slug]);

  const ensureSubmission = async (): Promise<string> => {
    if (submissionId) return submissionId;
    if (!funnel) return "";

    const sessionId = getOrCreateSessionId();
    const { data } = await (supabase as any)
      .from("quiz_submissions")
      .insert({ funnel_id: funnel.id, session_id: sessionId, status: "started" })
      .select("id")
      .single();

    const newId = data.id as string;
    setSubmissionId(newId);
    await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnel.id, p_field: "responses" });
    return newId;
  };

  const handleNextStep = async (forcedDestination?: string | null) => {
    if (!funnel || !steps[currentStepIndex]) return;

    setSubmitting(true);
    const sid = await ensureSubmission();

    // Navigation logic
    if (forcedDestination) {
      const targetIdx = steps.findIndex((s) => s.id === forcedDestination);
      if (targetIdx >= 0) {
        setCurrentStepIndex(targetIdx);
        setSubmitting(false);
        return;
      }
    }

    if (currentStepIndex >= steps.length - 1) {
      await (supabase as any)
        .from("quiz_submissions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", sid);
      await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnel.id, p_field: "completions" });
      setCompleted(true);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin opacity-60" />
      </div>
    );
  }

  if (!funnel || steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Funil não encontrado ou indisponível.
      </div>
    );
  }

  if (completed) {
    return (
      <div
        style={{ backgroundColor: funnel.designConfig.backgroundColor, color: funnel.designConfig.textColor }}
        className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-4"
      >
        <CheckCircle2 className="w-16 h-16" style={{ color: funnel.designConfig.primaryColor }} />
        <h2 className="text-2xl font-bold">Obrigado!</h2>
        <p className="text-sm opacity-70 max-w-md">Suas respostas foram salvas com sucesso!</p>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  const stepComponents = components.filter((c) => c.stepId === currentStep.id);

  return (
    <div
      style={{
        backgroundColor: funnel.designConfig.backgroundColor,
        fontFamily: `${funnel.designConfig.fontFamily}, sans-serif`,
      }}
      className="min-h-screen flex flex-col items-center justify-start py-8 px-4"
    >
      <QuizStepRenderer
        step={currentStep}
        components={stepComponents}
        designConfig={funnel.designConfig}
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        formValues={formValues}
        selectedOptions={selectedOptions}
        validationErrors={validationErrors}
        submitting={submitting}
        onFormChange={(compId, val) => {
          const formattedVal = compId.includes("phone") ? maskPhone(val) : val;
          setFormValues((prev) => ({ ...prev, [compId]: formattedVal }));
        }}
        onOptionSelect={(compId, optId, dest) => {
          setSelectedOptions((prev) => ({ ...prev, [compId]: [optId] }));
          setTimeout(() => handleNextStep(dest), 350);
        }}
        onNextStep={() => handleNextStep()}
        onPrevStep={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
      />
    </div>
  );
}
