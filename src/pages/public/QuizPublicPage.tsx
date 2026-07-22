import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuizStepRenderer } from "@/components/quiz/renderer/QuizStepRenderer";
import { QuizFunnel, QuizStep, QuizComponent, QuizDesignConfig } from "@/types/quiz";
import { quizTrackingService } from "@/services/quiz/quizTrackingService";

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
      
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content.trim(), "text/html");
        
        // 1. Process and execute all script elements
        const scripts = Array.from(doc.querySelectorAll("script"));
        scripts.forEach((s) => {
          const scriptEl = document.createElement("script");
          // Copy all attributes
          Array.from(s.attributes).forEach((attr) => {
            scriptEl.setAttribute(attr.name, attr.value);
          });
          // Set text content to execute script
          scriptEl.text = s.textContent || "";
          scriptEl.setAttribute("data-quiz-script", funnel.id);
          
          if (position === "prepend" && target.firstChild) {
            target.insertBefore(scriptEl, target.firstChild);
          } else {
            target.appendChild(scriptEl);
          }
          elementsToCleanup.push(scriptEl);
        });

        // 2. Remove scripts from temp document to avoid duplicates
        scripts.forEach((s) => s.parentNode?.removeChild(s));

        // 3. Inject remaining elements (style, noscript, meta, etc.)
        const remainingNodes = Array.from(doc.body.childNodes);
        remainingNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            el.setAttribute("data-quiz-script", funnel.id);
            if (position === "prepend" && target.firstChild) {
              target.insertBefore(el, target.firstChild);
            } else {
              target.appendChild(el);
            }
            elementsToCleanup.push(el);
          } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
            // Re-wrap comments and texts inside a hidden span to ensure clean up
            const wrap = document.createElement("span");
            wrap.style.display = "none";
            wrap.setAttribute("data-quiz-script", funnel.id);
            wrap.appendChild(node.cloneNode(true));
            
            if (position === "prepend" && target.firstChild) {
              target.insertBefore(wrap, target.firstChild);
            } else {
              target.appendChild(wrap);
            }
            elementsToCleanup.push(wrap);
          }
        });
      } catch (err) {
        console.warn("DOMParser script injection failed:", err);
      }
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
      gaInit.text = `
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
      gtmHead.text = `
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
      fbScript.text = `
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
      // Fallback query selector cleanup for elements in head or body
      const queryElements = document.querySelectorAll(`[data-quiz-script="${funnel.id}"]`);
      queryElements.forEach((el) => {
        el.parentNode?.removeChild(el);
      });
    };
  }, [funnel]);

  useEffect(() => {
    if (!funnel || steps.length === 0) return;

    const initTracking = async () => {
      // 1. Ensure anonymous submission
      const subId = await quizTrackingService.ensureAnonymousSubmission(funnel);
      setSubmissionId(subId);

      if (subId) {
        // 2. Track first step viewed
        const firstStep = steps[0];
        await quizTrackingService.trackQuizEvent({
          submissionId: subId,
          funnelId: funnel.id,
          companyId: funnel.companyId,
          sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
          eventName: "step_viewed",
          stepId: firstStep.id,
          payload: {
            stepIndex: 1,
            stepName: firstStep.name,
            navigationType: "next"
          }
        });

        // 3. Track step session entry
        await quizTrackingService.trackStepSessionEntry({
          submissionId: subId,
          funnelId: funnel.id,
          companyId: funnel.companyId,
          stepId: firstStep.id
        });

        // Update progress in DB
        await quizTrackingService.updateProgress({
          submissionId: subId,
          currentStepId: firstStep.id,
          stepsCompleted: 0,
          stepsViewed: 1,
          totalSteps: steps.length
        });
      }
    };

    initTracking();
  }, [funnel, steps]);

  // Heartbeat tracking
  useEffect(() => {
    if (!submissionId || !funnel) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        quizTrackingService.trackHeartbeat(submissionId);
      }
    }, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        quizTrackingService.trackHeartbeat(submissionId);
        quizTrackingService.trackQuizEvent({
          submissionId,
          funnelId: funnel.id,
          companyId: funnel.companyId,
          sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
          eventName: "quiz_resumed"
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [submissionId, funnel]);

  const handlePrevStep = async () => {
    if (currentStepIndex <= 0 || !submissionId || !funnel) return;
    
    const currentStep = steps[currentStepIndex];
    // Track step session exit
    await quizTrackingService.trackStepSessionExit({
      submissionId,
      stepId: currentStep.id,
      exitType: "back"
    });

    // Track event
    await quizTrackingService.trackQuizEvent({
      submissionId,
      funnelId: funnel.id,
      companyId: funnel.companyId,
      sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
      eventName: "back_clicked",
      stepId: currentStep.id
    });

    const prevIdx = currentStepIndex - 1;
    const prevStep = steps[prevIdx];
    setCurrentStepIndex(prevIdx);

    // Track next step entry
    await quizTrackingService.trackQuizEvent({
      submissionId,
      funnelId: funnel.id,
      companyId: funnel.companyId,
      sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
      eventName: "step_viewed",
      stepId: prevStep.id,
      payload: {
        stepIndex: prevIdx + 1,
        stepName: prevStep.name,
        navigationType: "back"
      }
    });

    await quizTrackingService.trackStepSessionEntry({
      submissionId,
      funnelId: funnel.id,
      companyId: funnel.companyId,
      stepId: prevStep.id
    });
  };

  const handleNextStep = async (forcedDestination?: string | null) => {
    if (!funnel || !steps[currentStepIndex] || !submissionId) return;

    setSubmitting(true);
    try {
      const currentStep = steps[currentStepIndex];
      const stepComponents = components.filter((c) => c.stepId === currentStep.id);

      // 1. Collect and save answers for components in this step
      let leadName = "";
      let leadEmail = "";
      let leadPhone = "";

      for (const comp of stepComponents) {
        if (comp.componentType.startsWith("field_")) {
          const val = formValues[comp.id];
          if (val) {
            await quizTrackingService.saveAnswer({
              submissionId,
              funnelId: funnel.id,
              companyId: funnel.companyId,
              stepId: currentStep.id,
              componentId: comp.id,
              answerValue: val
            });

            if (comp.componentType === "field_name") leadName = val;
            if (comp.componentType === "field_email") leadEmail = val;
            if (comp.componentType === "field_phone") leadPhone = val;

            // Track field completed
            await quizTrackingService.trackQuizEvent({
              submissionId,
              funnelId: funnel.id,
              companyId: funnel.companyId,
              sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
              eventName: "field_completed",
              stepId: currentStep.id,
              componentId: comp.id,
              payload: { valueLength: val.length }
            });
          }
        } else if (comp.componentType === "options" || comp.componentType === "cards_choice") {
          const opts = selectedOptions[comp.id];
          if (opts && opts.length > 0) {
            await quizTrackingService.saveAnswer({
              submissionId,
              funnelId: funnel.id,
              companyId: funnel.companyId,
              stepId: currentStep.id,
              componentId: comp.id,
              answerValue: opts
            });

            // Track option selected
            await quizTrackingService.trackQuizEvent({
              submissionId,
              funnelId: funnel.id,
              companyId: funnel.companyId,
              sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
              eventName: "option_selected",
              stepId: currentStep.id,
              componentId: comp.id,
              payload: { selectedOptions: opts }
            });
          }
        }
      }

      // 2. If lead information is entered, identify lead
      if (leadName || leadEmail || leadPhone) {
        await quizTrackingService.identifyLead({
          submissionId,
          funnel,
          leadData: { name: leadName, email: leadEmail, phone: leadPhone }
        });
      }

      // 3. Mark the submission as started if it was in anonymous state and we are moving past the first step
      if (currentStepIndex === 0) {
        await quizTrackingService.markSubmissionAsStarted(submissionId, funnel.id, funnel.companyId);
      }

      // 4. Exit current step session
      await quizTrackingService.trackStepSessionExit({
        submissionId,
        stepId: currentStep.id,
        exitType: currentStepIndex >= steps.length - 1 ? "completed" : "next"
      });

      // 5. Track step completed event
      await quizTrackingService.trackQuizEvent({
        submissionId,
        funnelId: funnel.id,
        companyId: funnel.companyId,
        sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
        eventName: "step_completed",
        stepId: currentStep.id,
        payload: {
          stepIndex: currentStepIndex + 1,
          stepName: currentStep.name,
          forcedDestination
        }
      });

      // 6. Navigation logic
      if (forcedDestination) {
        const targetIdx = steps.findIndex((s) => s.id === forcedDestination);
        if (targetIdx >= 0) {
          const nextStep = steps[targetIdx];
          setCurrentStepIndex(targetIdx);

          // Track next step entry
          await quizTrackingService.trackQuizEvent({
            submissionId,
            funnelId: funnel.id,
            companyId: funnel.companyId,
            sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
            eventName: "step_viewed",
            stepId: nextStep.id,
            payload: {
              stepIndex: targetIdx + 1,
              stepName: nextStep.name,
              navigationType: "next",
              forced: true
            }
          });

          await quizTrackingService.trackStepSessionEntry({
            submissionId,
            funnelId: funnel.id,
            companyId: funnel.companyId,
            stepId: nextStep.id
          });

          await quizTrackingService.updateProgress({
            submissionId,
            currentStepId: nextStep.id,
            stepsCompleted: currentStepIndex + 1,
            stepsViewed: Math.max(currentStepIndex + 2, targetIdx + 1),
            totalSteps: steps.length
          });
          return;
        }
      }

      if (currentStepIndex >= steps.length - 1) {
        // Complete the quiz
        await quizTrackingService.completeSubmission(submissionId, funnel.id, funnel.companyId);
        setCompleted(true);
      } else {
        const nextIdx = currentStepIndex + 1;
        const nextStep = steps[nextIdx];
        setCurrentStepIndex(nextIdx);

        // Track next step entry
        await quizTrackingService.trackQuizEvent({
          submissionId,
          funnelId: funnel.id,
          companyId: funnel.companyId,
          sessionId: quizTrackingService.getOrCreateSessionId(funnel.id),
          eventName: "step_viewed",
          stepId: nextStep.id,
          payload: {
            stepIndex: nextIdx + 1,
            stepName: nextStep.name,
            navigationType: "next"
          }
        });

        await quizTrackingService.trackStepSessionEntry({
          submissionId,
          funnelId: funnel.id,
          companyId: funnel.companyId,
          stepId: nextStep.id
        });

        await quizTrackingService.updateProgress({
          submissionId,
          currentStepId: nextStep.id,
          stepsCompleted: nextIdx,
          stepsViewed: nextIdx + 1,
          totalSteps: steps.length
        });
      }
    } catch (e) {
      console.error("Navigation error:", e);
      // Fallback navigation
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
        onPrevStep={handlePrevStep}
      />
    </div>
  );
}
