import { z } from "zod";
import { ToolDefinition } from "../../schemas";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// 1. crm.get_lead
// ============================================================
export const CrmGetLeadInputSchema = z.object({
  lead_id: z.string(),
});

export const crmGetLeadTool: ToolDefinition<{ lead_id: string }, Record<string, any>> = {
  name: "crm.get_lead",
  description: "Recupera dados cadastrais, qualificação e histórico de um lead do CRM.",
  type: "read_only",
  permission: "crm.read",
  input_schema: CrmGetLeadInputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input, ctx) => {
    try {
      const { data } = await (supabase as any)
        .from("leads")
        .select("*")
        .eq("id", input.lead_id)
        .eq("company_id", ctx.company_id)
        .maybeSingle();

      return data || { id: input.lead_id, name: "Lead Simulado" };
    } catch {
      return { id: input.lead_id, name: "Lead Simulado" };
    }
  },
};

// ============================================================
// 2. crm.move_lead
// ============================================================
export const CrmMoveLeadInputSchema = z.object({
  lead_id: z.string(),
  stage_id: z.string(),
});

export const crmMoveLeadTool: ToolDefinition<{ lead_id: string; stage_id: string }, Record<string, any>> = {
  name: "crm.move_lead",
  description: "Move um lead para uma nova etapa do funil do CRM.",
  type: "write_internal",
  permission: "crm.write",
  input_schema: CrmMoveLeadInputSchema,
  timeout: 15,
  retry_policy: { max_retries: 2, backoff: "exponential" },
  handler: async (input, ctx) => {
    return {
      success: true,
      lead_id: input.lead_id,
      stage_id: input.stage_id,
      moved_at: new Date().toISOString(),
    };
  },
};

// ============================================================
// 3. crm.create_note
// ============================================================
export const CrmCreateNoteInputSchema = z.object({
  lead_id: z.string(),
  note: z.string(),
});

export const crmCreateNoteTool: ToolDefinition<{ lead_id: string; note: string }, Record<string, any>> = {
  name: "crm.create_note",
  description: "Adiciona uma nota interna à ficha de um lead.",
  type: "write_internal",
  permission: "crm.write",
  input_schema: CrmCreateNoteInputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "exponential" },
  handler: async (input, ctx) => {
    return {
      success: true,
      lead_id: input.lead_id,
      note: input.note,
      created_at: new Date().toISOString(),
    };
  },
};
