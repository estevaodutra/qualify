import { ExecutionTraceRecord, ToolCallRecord } from "../schemas";
import { supabase } from "@/integrations/supabase/client";
import { estimateModelCost } from "../models/modelProfiles";

export function sanitizeSecrets(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeSecrets);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("key") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("password") ||
      lowerKey.includes("auth")
    ) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitizeSecrets(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export class ExecutionTracker {
  public trace: ExecutionTraceRecord;
  private startTime: number;

  constructor(params: {
    company_id: string;
    user_id?: string;
    agent?: string;
    agent_version?: number;
    skill?: string;
    skill_version?: number;
    workflow?: string;
    workflow_version?: number;
    model?: string;
  }) {
    this.startTime = Date.now();
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this.trace = {
      run_id: runId,
      company_id: params.company_id,
      user_id: params.user_id,
      agent: params.agent,
      agent_version: params.agent_version ?? 1,
      skill: params.skill,
      skill_version: params.skill_version ?? 1,
      workflow: params.workflow,
      workflow_version: params.workflow_version ?? 1,
      model: params.model || "gpt-4o-mini",
      tokens_input: 0,
      tokens_output: 0,
      tokens_total: 0,
      estimated_cost: 0,
      latency_ms: 0,
      status: "retrying",
      tool_calls: [],
      approvals: [],
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    };
  }

  public recordToolCall(record: ToolCallRecord) {
    this.trace.tool_calls.push({
      tool: record.tool,
      input: sanitizeSecrets(record.input),
      output: sanitizeSecrets(record.output),
      latency_ms: record.latency_ms,
      success: record.success,
      error: record.error,
    });
  }

  public addTokens(inputTokens: number, outputTokens: number) {
    this.trace.tokens_input += inputTokens;
    this.trace.tokens_output += outputTokens;
    this.trace.tokens_total = this.trace.tokens_input + this.trace.tokens_output;
    this.trace.estimated_cost = estimateModelCost(
      this.trace.model,
      this.trace.tokens_input,
      this.trace.tokens_output
    );
  }

  public finish(status: "success" | "error" | "interrupted", error?: string): ExecutionTraceRecord {
    this.trace.latency_ms = Date.now() - this.startTime;
    this.trace.status = status;
    this.trace.error = error;
    this.trace.finished_at = new Date().toISOString();
    return this.trace;
  }

  public async persistToDatabase(outputSummary?: any): Promise<void> {
    try {
      await (supabase as any).from("ai_executions").insert({
        id: this.trace.run_id.startsWith("run_") ? undefined : this.trace.run_id,
        company_id: this.trace.company_id,
        user_id: this.trace.user_id || null,
        action: this.trace.workflow || this.trace.skill || this.trace.agent || "ai_execution",
        skill_slug: this.trace.skill || "none",
        skill_version: this.trace.skill_version || 1,
        agent_slug: this.trace.agent || null,
        agent_version: this.trace.agent_version || null,
        workflow_slug: this.trace.workflow || null,
        workflow_version: this.trace.workflow_version || null,
        model_profile: "CONTENT_STANDARD",
        model: this.trace.model,
        tokens_input: this.trace.tokens_input,
        tokens_output: this.trace.tokens_output,
        estimated_cost: this.trace.estimated_cost,
        latency_ms: this.trace.latency_ms,
        status: this.trace.status,
        error: this.trace.error || null,
        tool_calls: this.trace.tool_calls,
        trace: sanitizeSecrets(this.trace),
        output: sanitizeSecrets(outputSummary || {}),
        started_at: this.trace.started_at,
        finished_at: this.trace.finished_at,
      });
    } catch {
      // Ignora falhas de persistência para não interromper fluxo principal
    }
  }
}
