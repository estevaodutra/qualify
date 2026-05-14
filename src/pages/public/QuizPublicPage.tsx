import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_DESIGN_CONFIG, DesignConfig } from "@/components/quiz/design/DesignTab";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FunnelData {
  id: string;
  name: string;
  slug: string;
  design_config: Record<string, unknown>;
  seo_config: Record<string, string>;
  pixel_config: Record<string, string>;
  webhook_config: Record<string, string>;
}

interface StepData {
  id: string;
  name: string;
  step_order: number;
  show_logo: boolean;
  show_progress: boolean;
  allow_back: boolean;
}

interface ComponentData {
  id: string;
  step_id: string;
  component_type: string;
  component_order: number;
  config: Record<string, unknown>;
}

interface QuizOption {
  id: string;
  text: string;
  value: string;
  points: number;
  destination: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchPublicFunnel(slug: string) {
  const { data: funnel } = await (supabase as any)
    .from("quiz_funnels")
    .select("id, name, slug, design_config, seo_config, pixel_config, webhook_config")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  if (!funnel) return null;

  const [{ data: steps }, { data: components }] = await Promise.all([
    (supabase as any)
      .from("quiz_steps")
      .select("*")
      .eq("funnel_id", funnel.id)
      .order("step_order", { ascending: true }),
    (supabase as any)
      .from("quiz_components")
      .select("*")
      .eq("funnel_id", funnel.id)
      .order("component_order", { ascending: true }),
  ]);

  return {
    funnel: funnel as FunnelData,
    steps: (steps || []) as StepData[],
    components: (components || []) as ComponentData[],
  };
}

function getOrCreateSessionId(): string {
  const key = "quiz_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

const RADIUS: Record<string, string> = { square: "4px", medium: "12px", rounded: "24px" };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuizPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Accumulated lead data across all steps (persists across step navigation)
  const accumulatedLead = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!slug) return;
    fetchPublicFunnel(slug).then((result) => {
      if (result) {
        setFunnel(result.funnel);
        setSteps(result.steps);
        setComponents(result.components);
        injectPixels(result.funnel.pixel_config || {});
        injectSeoMeta(result.funnel.seo_config || {}, result.funnel.name);
        recordVisit(result.funnel.id);
      }
      setLoading(false);
    });
  }, [slug]);

  // ─── Pixel injection ─────────────────────────────────────────────────────

  function injectPixels(pixel: Record<string, string>) {
    if (pixel.gaId) {
      const s = document.createElement("script");
      s.src = `https://www.googletagmanager.com/gtag/js?id=${pixel.gaId}`;
      s.async = true;
      document.head.appendChild(s);
      const s2 = document.createElement("script");
      s2.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${pixel.gaId}');`;
      document.head.appendChild(s2);
    }
    if (pixel.gtmId) {
      const s = document.createElement("script");
      s.text = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${pixel.gtmId}');`;
      document.head.appendChild(s);
    }
    if (pixel.fbPixelId) {
      const s = document.createElement("script");
      s.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel.fbPixelId}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }

  function injectSeoMeta(seo: Record<string, string>, funnelName: string) {
    const setMeta = (name: string, content: string, prop = false) => {
      if (!content) return;
      const existing = document.querySelector(prop ? `meta[property="${name}"]` : `meta[name="${name}"]`);
      if (existing) {
        existing.setAttribute("content", content);
      } else {
        const m = document.createElement("meta");
        if (prop) m.setAttribute("property", name);
        else m.setAttribute("name", name);
        m.setAttribute("content", content);
        document.head.appendChild(m);
      }
    };

    document.title = seo.title || funnelName;
    setMeta("description", seo.description);
    setMeta("og:title", seo.title || funnelName, true);
    setMeta("og:description", seo.description, true);
    setMeta("og:image", seo.ogImage, true);
  }

  // ─── Supabase helpers ────────────────────────────────────────────────────

  const recordVisit = async (funnelId: string) => {
    await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnelId, p_field: "visits" });
  };

  const ensureSubmission = async (funnelId: string): Promise<string> => {
    if (submissionId) return submissionId;
    const sessionId = getOrCreateSessionId();
    const { data } = await (supabase as any)
      .from("quiz_submissions")
      .insert({ funnel_id: funnelId, session_id: sessionId, status: "started" })
      .select("id")
      .single();
    const id = data.id as string;
    setSubmissionId(id);
    await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnelId, p_field: "responses" });
    return id;
  };

  const saveAnswer = async (componentId: string, stepId: string, value: unknown) => {
    if (!funnel) return;
    const sid = await ensureSubmission(funnel.id);
    await (supabase as any).from("quiz_answers").insert({
      submission_id: sid,
      funnel_id: funnel.id,
      step_id: stepId,
      component_id: componentId,
      answer_value: value,
    });
  };

  const saveLeadData = async (data: { name?: string; email?: string; phone?: string }) => {
    if (!funnel || (!data.email && !data.phone)) return;
    const sid = submissionId || (await ensureSubmission(funnel.id));

    const { data: lead } = await (supabase as any)
      .from("leads")
      .upsert(
        {
          phone: data.phone || null,
          name: data.name || null,
          email: data.email || null,
        },
        { onConflict: "phone", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (lead?.id) {
      await (supabase as any).from("quiz_submissions").update({ lead_id: lead.id }).eq("id", sid);
      await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnel.id, p_field: "leads" });
    }
  };

  const fireWebhook = async (leadData: Record<string, string>, allAnswers: Record<string, unknown>) => {
    if (!funnel) return;
    const wh = funnel.webhook_config;
    if (!wh?.url) return;
    try {
      await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(wh.token ? { Authorization: `Bearer ${wh.token}` } : {}),
        },
        body: JSON.stringify({
          funnelSlug: funnel.slug,
          funnelId: funnel.id,
          ...leadData,
          answers: allAnswers,
        }),
      });
    } catch {
      // Webhook errors don't block the user
    }
  };

  // ─── Navigation ──────────────────────────────────────────────────────────

  const currentStep = steps[currentStepIndex] || null;
  const currentComponents = components.filter((c) => c.step_id === currentStep?.id);

  const handleOptionSelect = (componentId: string, optionId: string, multiple: boolean, destination: string | null) => {
    if (multiple) {
      const current = selectedOptions[componentId] || [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setSelectedOptions({ ...selectedOptions, [componentId]: next });
    } else {
      setSelectedOptions({ ...selectedOptions, [componentId]: [optionId] });
      setTimeout(() => handleNextStep(destination), 350);
    }
  };

  const handleNextStep = async (forcedDestination?: string | null) => {
    if (!currentStep || !funnel) return;

    // ─── Validation of required fields ───────────────────────────────────────
    const errors: Record<string, string> = {};
    for (const comp of currentComponents) {
      if (["field_name", "field_email", "field_phone"].includes(comp.component_type)) {
        if (comp.config.required && !formValues[comp.id]?.trim()) {
          errors[comp.id] = "Este campo é obrigatório.";
        }
      }
      if (comp.component_type === "options" && comp.config.required) {
        if (!selectedOptions[comp.id]?.length) {
          errors[comp.id] = "Selecione pelo menos uma opção.";
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    setSubmitting(true);

    // Collect all field values for lead + webhook payload
    const stepLeadData: Record<string, string> = {};
    const allAnswers: Record<string, unknown> = {};

    for (const comp of currentComponents) {
      if (["field_name", "field_email", "field_phone"].includes(comp.component_type)) {
        const val = formValues[comp.id] || "";
        if (val) {
          await saveAnswer(comp.id, currentStep.id, val);
          const key = comp.component_type === "field_name" ? "name" : comp.component_type === "field_email" ? "email" : "phone";
          stepLeadData[key] = val;
          allAnswers[comp.id] = val;
        }
      }
      if (comp.component_type === "options") {
        const selected = selectedOptions[comp.id];
        if (selected?.length) {
          await saveAnswer(comp.id, currentStep.id, selected);
          allAnswers[comp.id] = selected;
        }
      }
    }

    // Accumulate lead data across all steps
    Object.assign(accumulatedLead.current, stepLeadData);
    const leadData = accumulatedLead.current;

    // Persist lead data when we have identifying info
    if (leadData.email || leadData.phone) {
      await ensureSubmission(funnel.id);
      await saveLeadData(leadData);
    }

    // Webhook for "each_step" trigger
    const wh = funnel.webhook_config;
    if (wh?.trigger === "each_step") await fireWebhook(leadData, allAnswers);

    // Update steps_completed
    const sid = submissionId || (await ensureSubmission(funnel.id));
    await (supabase as any)
      .from("quiz_submissions")
      .update({ steps_completed: currentStepIndex + 1 })
      .eq("id", sid);

    // Navigate
    if (forcedDestination) {
      const targetIndex = steps.findIndex((s) => s.id === forcedDestination);
      if (targetIndex >= 0) {
        setCurrentStepIndex(targetIndex);
        setSubmitting(false);
        return;
      }
    }

    if (currentStepIndex >= steps.length - 1) {
      // Complete
      await (supabase as any)
        .from("quiz_submissions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", sid);
      await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnel.id, p_field: "completions" });
      if (wh?.trigger === "completion" || !wh?.trigger) await fireWebhook(leadData, allAnswers);
      setCompleted(true);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
    setSubmitting(false);
  };

  // ─── Design ──────────────────────────────────────────────────────────────

  const d: DesignConfig = { ...DEFAULT_DESIGN_CONFIG, ...(funnel?.design_config as Partial<DesignConfig> || {}) };
  const borderRadius = RADIUS[d.borderRadius] || "12px";

  const cssVars = {
    "--quiz-primary": d.primaryColor,
    "--quiz-bg": d.backgroundColor,
    "--quiz-text": d.textColor,
    fontFamily: d.fontFamily + ", sans-serif",
    backgroundColor: d.backgroundColor,
    color: d.textColor,
  } as React.CSSProperties;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={cssVars}>
        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
      </div>
    );
  }

  if (!funnel || steps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Funil não encontrado ou não publicado.
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center" style={cssVars}>
        <CheckCircle className="w-16 h-16" style={{ color: d.primaryColor }} />
        <h2 className="text-2xl font-bold">Obrigado!</h2>
        <p className="opacity-60">Suas respostas foram registradas com sucesso.</p>
      </div>
    );
  }

  if (!currentStep) return null;

  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-8 px-4" style={cssVars}>
      <div
        className="w-full max-w-lg shadow-lg overflow-hidden"
        style={{ borderRadius, backgroundColor: d.backgroundColor, color: d.textColor }}
      >
        {/* Progress */}
        {currentStep.show_progress && (
          <div className="h-1.5" style={{ backgroundColor: d.primaryColor + "30" }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: d.primaryColor }}
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Logo */}
          {currentStep.show_logo && d.logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={d.logoUrl}
                alt="Logo"
                className="h-8 object-contain"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}

          {/* Back button */}
          {currentStep.allow_back && currentStepIndex > 0 && (
            <button
              className="flex items-center gap-1 text-sm opacity-50 hover:opacity-80"
              onClick={() => setCurrentStepIndex((i) => i - 1)}
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}

          {/* Components */}
          {currentComponents.map((comp) => (
            <PublicComponent
              key={comp.id}
              component={comp}
              formValue={formValues[comp.id] || ""}
              selectedOptions={selectedOptions[comp.id] || []}
              primaryColor={d.primaryColor}
              borderRadius={borderRadius}
              validationError={validationErrors[comp.id]}
              onFormChange={(val) => {
                setFormValues({ ...formValues, [comp.id]: val });
                if (validationErrors[comp.id]) setValidationErrors((e) => { const n = { ...e }; delete n[comp.id]; return n; });
              }}
              onOptionSelect={(optId, destination) =>
                handleOptionSelect(comp.id, optId, !!(comp.config.multiple as boolean), destination)
              }
              onNext={() => handleNextStep()}
              submitting={submitting}
            />
          ))}

          {/* Auto next button — only if no button component in this step */}
          {!currentComponents.some((c) => c.component_type === "button") && (
            <button
              disabled={submitting}
              onClick={() => handleNextStep()}
              className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{
                borderRadius,
                backgroundColor: d.primaryColor,
                color: "#fff",
              }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {currentStepIndex >= steps.length - 1 ? "Concluir" : "Continuar"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="px-6 pb-4 text-center text-xs opacity-40">
          {currentStepIndex + 1} / {steps.length}
        </div>
      </div>
    </div>
  );
}

// ─── Public Component Renderer ────────────────────────────────────────────────

function PublicComponent({
  component,
  formValue,
  selectedOptions,
  primaryColor,
  borderRadius,
  validationError,
  onFormChange,
  onOptionSelect,
  onNext,
  submitting,
}: {
  component: ComponentData;
  formValue: string;
  selectedOptions: string[];
  primaryColor: string;
  borderRadius: string;
  validationError?: string;
  onFormChange: (val: string) => void;
  onOptionSelect: (optId: string, destination: string | null) => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const { component_type: type, config } = component;

  if (type === "text") {
    return (
      <div
        className="text-sm"
        style={{ textAlign: (config.align as any) || "center" }}
        dangerouslySetInnerHTML={{ __html: (config.content as string) || "" }}
      />
    );
  }

  if (type === "image" && config.url) {
    return (
      <img
        src={config.url as string}
        alt={(config.alt as string) || ""}
        className="w-full"
        style={{ borderRadius }}
      />
    );
  }

  if (type === "button") {
    const style = config.style as string || "primary";
    return (
      <button
        disabled={submitting}
        onClick={onNext}
        className="w-full py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
        style={{
          borderRadius,
          backgroundColor: style === "primary" ? primaryColor : "transparent",
          color: style === "primary" ? "#fff" : primaryColor,
          border: style !== "primary" ? `2px solid ${primaryColor}` : "none",
        }}
      >
        {(config.text as string) || "Continuar"}
      </button>
    );
  }

  if (type === "options") {
    const options = (config.options as QuizOption[]) || [];
    const multiple = !!(config.multiple as boolean);
    return (
      <div className="space-y-2">
        {config.question && (
          <p className="text-base font-semibold text-center mb-4">{config.question as string}</p>
        )}
        {options.map((opt) => {
          const isSelected = selectedOptions.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onOptionSelect(opt.id, opt.destination)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all border-2"
              style={{
                borderRadius,
                borderColor: isSelected ? primaryColor : "currentColor",
                opacity: isSelected ? 1 : 0.7,
                backgroundColor: isSelected ? primaryColor + "10" : "transparent",
              }}
            >
              <span
                className="w-6 h-6 flex items-center justify-center text-[10px] font-bold shrink-0 border-2"
                style={{
                  borderRadius: "50%",
                  borderColor: isSelected ? primaryColor : "currentColor",
                  color: isSelected ? primaryColor : "currentColor",
                }}
              >
                {opt.value}
              </span>
              {opt.text}
            </button>
          );
        })}
        {multiple && selectedOptions.length > 0 && (
          <button
            className="w-full py-3 text-sm font-semibold mt-2"
            style={{ borderRadius, backgroundColor: primaryColor, color: "#fff" }}
            onClick={onNext}
            disabled={submitting}
          >
            Continuar
          </button>
        )}
      </div>
    );
  }

  if (type === "field_name" || type === "field_email" || type === "field_phone") {
    const inputType = type === "field_email" ? "email" : type === "field_phone" ? "tel" : "text";
    const hasError = !!validationError;
    return (
      <div className="space-y-1.5">
        {config.label && <label className="text-sm font-medium">{config.label as string}</label>}
        <input
          type={inputType}
          placeholder={(config.placeholder as string) || ""}
          value={formValue}
          onChange={(e) => onFormChange(e.target.value)}
          className="w-full px-3 py-2.5 border-2 text-sm outline-none transition-colors"
          style={{
            borderRadius,
            borderColor: hasError ? "#ef4444" : "currentColor",
            opacity: hasError ? 1 : 0.7,
            backgroundColor: "transparent",
            color: "inherit",
          }}
          onFocus={(e) => (e.currentTarget.style.opacity = "1")}
          onBlur={(e) => (e.currentTarget.style.opacity = hasError ? "1" : "0.7")}
        />
        {hasError && <p className="text-xs text-red-500">{validationError}</p>}
      </div>
    );
  }

  return null;
}
