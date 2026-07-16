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
      try {
        await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: formattedFunnel.id, p_field: "visits" });
      } catch (visitErr) {
        console.warn("Visits RPC error:", visitErr);
      }
      setLoading(false);
    }

    loadPublicData();
  }, [slug]);

  // Inject tracking pixels and custom scripts
  React.useEffect(() => {
    if (!funnel) return;

    const pc = funnel.pixelConfig as Record<string, string> || {};
    const elementsToCleanup: HTMLElement[] = [];

    // Helper to append script
    const injectScript = (content: string, target: HTMLElement, position: "append" | "prepend" = "append") => {
      if (!content || !content.trim()) return;
      
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content.trim();

      const children = Array.from(tempDiv.childNodes);
      children.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          if (tagName === "script") {
            const scriptEl = document.createElement("script");
            Array.from(el.attributes).forEach((attr) => {
              scriptEl.setAttribute(attr.name, attr.value);
            });
            if (el.innerHTML) {
              scriptEl.innerHTML = el.innerHTML;
            }
            scriptEl.setAttribute("data-quiz-script", funnel.id);
            if (position === "prepend" && target.firstChild) {
              target.insertBefore(scriptEl, target.firstChild);
            } else {
              target.appendChild(scriptEl);
            }
            elementsToCleanup.push(scriptEl);
          } else {
            const newEl = el.cloneNode(true) as HTMLElement;
            newEl.setAttribute("data-quiz-script", funnel.id);
            if (position === "prepend" && target.firstChild) {
              target.insertBefore(newEl, target.firstChild);
            } else {
              target.appendChild(newEl);
            }
            elementsToCleanup.push(newEl);
          }
        }
      });
    };

    // 1. Google Site Verification
    if (pc.googleSiteVerification) {
      const meta = document.createElement("meta");
      meta.name = "google-site-verification";
      meta.content = pc.googleSiteVerification;
      meta.setAttribute("data-quiz-script", funnel.id);
      document.head.appendChild(meta);
      elementsToCleanup.push(meta);
    }

    // 2. Google Analytics 4 (GA4)
    if (pc.gaId) {
      const gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${pc.gaId}`;
      gaScript.setAttribute("data-quiz-script", funnel.id);
      document.head.appendChild(gaScript);
      elementsToCleanup.push(gaScript);

      const gaInit = document.createElement("script");
      gaInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${pc.gaId}');
      `;
      gaInit.setAttribute("data-quiz-script", funnel.id);
      document.head.appendChild(gaInit);
      elementsToCleanup.push(gaInit);
    }

    // 3. Google Tag Manager (GTM)
    if (pc.gtmId) {
      const gtmHead = document.createElement("script");
      gtmHead.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${pc.gtmId}');
      `;
      gtmHead.setAttribute("data-quiz-script", funnel.id);
      document.head.appendChild(gtmHead);
      elementsToCleanup.push(gtmHead);

      const gtmNoscript = document.createElement("noscript");
      gtmNoscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${pc.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      gtmNoscript.setAttribute("data-quiz-script", funnel.id);
      document.body.insertBefore(gtmNoscript, document.body.firstChild);
      elementsToCleanup.push(gtmNoscript);
    }

    // 4. Facebook Pixel
    if (pc.fbPixelId) {
      const fbScript = document.createElement("script");
      fbScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pc.fbPixelId}');
        fbq('track', 'PageView');
      `;
      fbScript.setAttribute("data-quiz-script", funnel.id);
      document.head.appendChild(fbScript);
      elementsToCleanup.push(fbScript);

      const fbNoscript = document.createElement("noscript");
      fbNoscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pc.fbPixelId}&ev=PageView&noscript=1" />`;
      fbNoscript.setAttribute("data-quiz-script", funnel.id);
      document.body.appendChild(fbNoscript);
      elementsToCleanup.push(fbNoscript);
    }

    // 5. Custom Head Script
    if (pc.headScript) {
      injectScript(pc.headScript, document.head);
    }

    // 6. Custom Body Script (prepend to body start)
    if (pc.bodyScript) {
      injectScript(pc.bodyScript, document.body, "prepend");
    }

    // 7. Custom Footer Script (append to body end)
    if (pc.footerScript) {
      injectScript(pc.footerScript, document.body);
    }

    return () => {
      elementsToCleanup.forEach((el) => {
        el.parentNode?.removeChild(el);
      });
    };
  }, [funnel]);

  const ensureSubmission = async (): Promise<string> => {
    if (submissionId) return submissionId;
    if (!funnel) return "";

    try {
      const sessionId = getOrCreateSessionId();
      const { data, error } = await (supabase as any)
        .from("quiz_submissions")
        .insert({ funnel_id: funnel.id, session_id: sessionId, status: "started" })
        .select("id")
        .single();

      if (error) {
        console.warn("Could not insert submission:", error);
        return "";
      }

      const newId = data?.id as string;
      if (newId) {
        setSubmissionId(newId);
        try {
          await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnel.id, p_field: "responses" });
        } catch (rpcErr) {
          console.warn("Responses RPC error:", rpcErr);
        }
      }
      return newId || "";
    } catch (err) {
      console.warn("ensureSubmission caught error:", err);
      return "";
    }
  };

  const handleNextStep = async (forcedDestination?: string | null) => {
    if (!funnel || !steps[currentStepIndex]) return;

    setSubmitting(true);
    try {
      const sid = await ensureSubmission();

      // Navigation logic
      if (forcedDestination) {
        const targetIdx = steps.findIndex((s) => s.id === forcedDestination);
        if (targetIdx >= 0) {
          setCurrentStepIndex(targetIdx);
          return;
        }
      }

      if (currentStepIndex >= steps.length - 1) {
        if (sid) {
          try {
            await (supabase as any)
              .from("quiz_submissions")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", sid);
            await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnel.id, p_field: "completions" });
          } catch (dbErr) {
            console.warn("Could not finalize submission:", dbErr);
          }
        }
        setCompleted(true);
      } else {
        setCurrentStepIndex((prev) => prev + 1);
      }
    } catch (e) {
      console.error("Navigation error:", e);
      // Fallback navigation in case of unexpected exception
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setCompleted(true);
      }
    } finally {
      setSubmitting(false);
    }
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
