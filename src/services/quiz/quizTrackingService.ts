import { supabase } from "@/integrations/supabase/client";
import { QuizEventName, QuizSubmissionDetail } from "@/types/quiz/tracking";
import { QuizFunnel } from "@/hooks/useQuizFunnels";

// Helper to parse user agent
function parseUserAgent(ua: string) {
  let browser = "Other";
  let os = "Other";
  let deviceType = "desktop";

  if (/mobile/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  }

  if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|iceweasel/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = "Safari";
  } else if (/msie|trident/i.test(ua)) {
    browser = "Internet Explorer";
  } else if (/edge/i.test(ua)) {
    browser = "Edge";
  }

  if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/android/i.test(ua)) {
    os = "Android";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = "iOS";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  return { browser, os, deviceType };
}

export const quizTrackingService = {
  getOrCreateSessionId(funnelId: string): string {
    const key = `qualify_quiz_session_${funnelId}`;
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  },

  async ensureAnonymousSubmission(funnel: QuizFunnel): Promise<string> {
    const sessionId = this.getOrCreateSessionId(funnel.id);
    
    try {
      // Check for existing started or anonymous submission in this session
      const { data: existing, error: fetchErr } = await (supabase as any)
        .from("quiz_submissions")
        .select("id, status")
        .eq("funnel_id", funnel.id)
        .eq("session_id", sessionId)
        .order("first_seen_at", { ascending: false })
        .limit(1);

      if (!fetchErr && existing && existing.length > 0) {
        const lastSub = existing[0];
        // If completed or abandoned, we create a new submission when user restarts
        if (lastSub.status !== "completed" && lastSub.status !== "abandoned") {
          return lastSub.id;
        }
      }

      // Collect analytics metadata
      const ua = navigator.userAgent;
      const { browser, os, deviceType } = parseUserAgent(ua);
      const entryUrl = window.location.href;
      const referrer = document.referrer || null;

      // Extract UTMs
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source");
      const utmMedium = urlParams.get("utm_medium");
      const utmCampaign = urlParams.get("utm_campaign");
      const utmContent = urlParams.get("utm_content");
      const utmTerm = urlParams.get("utm_term");

      // Insert new anonymous submission
      const submissionId = crypto.randomUUID();
      const { error: insertErr } = await (supabase as any)
        .from("quiz_submissions")
        .insert({
          id: submissionId,
          funnel_id: funnel.id,
          company_id: funnel.companyId || null,
          session_id: sessionId,
          status: "anonymous",
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          entry_url: entryUrl,
          referrer: referrer,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_content: utmContent,
          utm_term: utmTerm,
          device_type: deviceType,
          browser: browser,
          operating_system: os,
          user_agent: ua,
          steps_viewed: 1,
          progress_percentage: 0
        });

      if (insertErr) {
        console.warn("Could not insert anonymous submission:", insertErr);
        return "";
      }

      // Increment visits count in DB
      try {
        await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnel.id, p_field: "visits" });
      } catch (visitErr) {
        console.warn("Visits RPC error:", visitErr);
      }

      // Track initial quiz_viewed event
      await this.trackQuizEvent({
        submissionId,
        funnelId: funnel.id,
        companyId: funnel.companyId,
        sessionId,
        eventName: "quiz_viewed",
        payload: { entryUrl, referrer }
      });

      return submissionId;
    } catch (err) {
      console.warn("ensureAnonymousSubmission caught error:", err);
      return "";
    }
  },

  async markSubmissionAsStarted(submissionId: string, funnelId: string, companyId?: string): Promise<void> {
    if (!submissionId) return;
    try {
      // Check current status
      const { data, error } = await (supabase as any)
        .from("quiz_submissions")
        .select("status")
        .eq("id", submissionId)
        .single();
        
      if (error || !data || data.status !== "anonymous") return;

      // Update status to started
      await (supabase as any)
        .from("quiz_submissions")
        .update({
          status: "started",
          started_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        })
        .eq("id", submissionId);

      // Increment responses count
      try {
        await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnelId, p_field: "responses" });
      } catch (rpcErr) {
        console.warn("Responses RPC error:", rpcErr);
      }

      // Track quiz_started event
      const sessionId = this.getOrCreateSessionId(funnelId);
      await this.trackQuizEvent({
        submissionId,
        funnelId,
        companyId,
        sessionId,
        eventName: "quiz_started"
      });
    } catch (err) {
      console.warn("markSubmissionAsStarted error:", err);
    }
  },

  async trackQuizEvent(params: {
    submissionId: string;
    funnelId: string;
    companyId?: string;
    sessionId: string;
    eventName: QuizEventName;
    stepId?: string | null;
    componentId?: string | null;
    payload?: Record<string, any>;
  }): Promise<void> {
    if (!params.submissionId) return;
    try {
      await (supabase as any)
        .from("quiz_events")
        .insert({
          company_id: params.companyId || null,
          funnel_id: params.funnelId,
          submission_id: params.submissionId,
          session_id: params.sessionId,
          event_name: params.eventName,
          step_id: params.stepId || null,
          component_id: params.componentId || null,
          payload: params.payload || {}
        });
    } catch (err) {
      console.warn("trackQuizEvent error:", err);
    }
  },

  async trackStepSessionEntry(params: {
    submissionId: string;
    funnelId: string;
    companyId?: string;
    stepId: string;
  }): Promise<string> {
    if (!params.submissionId) return "";
    try {
      // First, close any un-closed step sessions for this submission
      await (supabase as any)
        .from("quiz_step_sessions")
        .update({
          exited_at: new Date().toISOString(),
          exit_type: "abandon"
        })
        .eq("submission_id", params.submissionId)
        .is("exited_at", null);

      const sessionId = crypto.randomUUID();
      const { data, error } = await (supabase as any)
        .from("quiz_step_sessions")
        .insert({
          id: sessionId,
          company_id: params.companyId || null,
          funnel_id: params.funnelId,
          submission_id: params.submissionId,
          step_id: params.stepId,
          entered_at: new Date().toISOString()
        })
        .select("id")
        .single();
      
      if (error) throw error;
      return data?.id || "";
    } catch (err) {
      console.warn("trackStepSessionEntry error:", err);
      return "";
    }
  },

  async trackStepSessionExit(params: {
    submissionId: string;
    stepId: string;
    exitType: "next" | "back" | "abandon" | "completed";
  }): Promise<void> {
    if (!params.submissionId) return;
    try {
      // Find the current active step session
      const { data, error } = await (supabase as any)
        .from("quiz_step_sessions")
        .select("id, entered_at")
        .eq("submission_id", params.submissionId)
        .eq("step_id", params.stepId)
        .is("exited_at", null)
        .order("entered_at", { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return;

      const activeSession = data[0];
      const enteredAt = new Date(activeSession.entered_at);
      const exitedAt = new Date();
      const durationSeconds = Math.round((exitedAt.getTime() - enteredAt.getTime()) / 1000);

      await (supabase as any)
        .from("quiz_step_sessions")
        .update({
          exited_at: exitedAt.toISOString(),
          duration_seconds: durationSeconds,
          exit_type: params.exitType
        })
        .eq("id", activeSession.id);
    } catch (err) {
      console.warn("trackStepSessionExit error:", err);
    }
  },

  async saveAnswer(params: {
    submissionId: string;
    funnelId: string;
    companyId?: string;
    stepId: string;
    componentId: string;
    answerValue: any;
  }): Promise<void> {
    if (!params.submissionId) return;
    try {
      // UPSERT using constraints
      await (supabase as any)
        .from("quiz_answers")
        .upsert({
          submission_id: params.submissionId,
          funnel_id: params.funnelId,
          company_id: params.companyId || null,
          step_id: params.stepId,
          component_id: params.componentId,
          answer_value: params.answerValue,
          answered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: "submission_id,component_id"
        });
    } catch (err) {
      console.warn("saveAnswer error:", err);
    }
  },

  async updateProgress(params: {
    submissionId: string;
    currentStepId: string;
    stepsCompleted: number;
    stepsViewed: number;
    totalSteps: number;
  }): Promise<void> {
    if (!params.submissionId) return;
    try {
      const progressPercentage = params.totalSteps > 0 
        ? Math.round((params.stepsCompleted / params.totalSteps) * 100)
        : 0;

      await (supabase as any)
        .from("quiz_submissions")
        .update({
          current_step_id: params.currentStepId,
          steps_completed: params.stepsCompleted,
          steps_viewed: params.stepsViewed,
          progress_percentage: progressPercentage,
          last_seen_at: new Date().toISOString()
        })
        .eq("id", params.submissionId);
    } catch (err) {
      console.warn("updateProgress error:", err);
    }
  },

  async trackHeartbeat(submissionId: string): Promise<void> {
    if (!submissionId) return;
    try {
      await (supabase as any)
        .from("quiz_submissions")
        .update({
          last_seen_at: new Date().toISOString()
        })
        .eq("id", submissionId);
    } catch (err) {
      console.warn("trackHeartbeat error:", err);
    }
  },

  async identifyLead(params: {
    submissionId: string;
    funnel: QuizFunnel;
    leadData: { name?: string; email?: string; phone?: string };
  }): Promise<string> {
    if (!params.submissionId || !params.funnel.companyId) return "";

    try {
      const cleanPhone = params.leadData.phone?.replace(/\D/g, "") || "";
      const email = params.leadData.email?.trim() || "";
      const name = params.leadData.name?.trim() || "";

      if (!cleanPhone && !email && !name) return "";

      // Fetch active user from auth to link creator (if any)
      const { data: authUser } = await supabase.auth.getUser();

      let leadId = "";

      // 1. Deduplicate by phone
      if (cleanPhone) {
        const { data: existing, error } = await supabase
          .from("leads")
          .select("id")
          .eq("phone", cleanPhone)
          .eq("company_id", params.funnel.companyId)
          .maybeSingle();

        if (!error && existing) {
          leadId = existing.id;
        }
      }

      // 2. Deduplicate by email if phone is missing or not found
      if (!leadId && email) {
        const { data: existing, error } = await supabase
          .from("leads")
          .select("id")
          .eq("email", email)
          .eq("company_id", params.funnel.companyId)
          .maybeSingle();

        if (!error && existing) {
          leadId = existing.id;
        }
      }

      if (leadId) {
        // Update existing lead name/email if blank
        const updates: Record<string, any> = {};
        if (name) updates.name = name;
        if (email) updates.email = email;

        await supabase
          .from("leads")
          .update(updates)
          .eq("id", leadId);
      } else {
        // Create new lead
        const { data: created, error: insertErr } = await supabase
          .from("leads")
          .insert({
            company_id: params.funnel.companyId,
            user_id: authUser?.user?.id || null,
            name: name || "Visitante Anônimo",
            phone: cleanPhone || null,
            email: email || null,
            source_type: "quiz",
            source_id: params.funnel.id,
            source_name: params.funnel.name,
            tags: ["Funil de Quiz"]
          })
          .select("id")
          .single();

        if (!insertErr && created) {
          leadId = created.id;
        }
      }

      if (leadId) {
        // Associate lead with quiz submission and update status
        const { data: subData } = await (supabase as any)
          .from("quiz_submissions")
          .select("status")
          .eq("id", params.submissionId)
          .single();

        const currentStatus = subData?.status || "anonymous";
        const nextStatus = currentStatus === "completed" ? "completed" : "identified";

        await (supabase as any)
          .from("quiz_submissions")
          .update({
            lead_id: leadId,
            status: nextStatus,
            last_seen_at: new Date().toISOString()
          })
          .eq("id", params.submissionId);

        // Increment leads count in funnel statistics
        try {
          await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: params.funnel.id, p_field: "leads" });
        } catch (rpcErr) {
          console.warn("Leads RPC error:", rpcErr);
        }

        // Track lead_identified event
        const sessionId = this.getOrCreateSessionId(params.funnel.id);
        await this.trackQuizEvent({
          submissionId: params.submissionId,
          funnelId: params.funnel.id,
          companyId: params.funnel.companyId,
          sessionId,
          eventName: "lead_identified",
          payload: { name, email, phone: cleanPhone }
        });
      }

      return leadId;
    } catch (err) {
      console.warn("identifyLead error:", err);
      return "";
    }
  },

  async completeSubmission(submissionId: string, funnelId: string, companyId?: string): Promise<void> {
    if (!submissionId) return;
    try {
      // Mark as completed
      const now = new Date().toISOString();
      await (supabase as any)
        .from("quiz_submissions")
        .update({
          status: "completed",
          completed_at: now,
          last_seen_at: now
        })
        .eq("id", submissionId);

      // Increment completions count
      try {
        await (supabase as any).rpc("quiz_funnel_increment", { p_funnel_id: funnelId, p_field: "completions" });
      } catch (rpcErr) {
        console.warn("Completions RPC error:", rpcErr);
      }

      // Track quiz_completed event
      const sessionId = this.getOrCreateSessionId(funnelId);
      await this.trackQuizEvent({
        submissionId,
        funnelId,
        companyId,
        sessionId,
        eventName: "quiz_completed"
      });
    } catch (err) {
      console.warn("completeSubmission error:", err);
    }
  }
};
