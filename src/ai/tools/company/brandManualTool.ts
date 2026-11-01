import { z } from "zod";
import { ToolDefinition } from "../../schemas";
import { supabase } from "@/integrations/supabase/client";

export const GetBrandManualInputSchema = z.object({
  company_id: z.string().optional(),
});

export type GetBrandManualInput = z.infer<typeof GetBrandManualInputSchema>;

export const brandManualTool: ToolDefinition<GetBrandManualInput, Record<string, any>> = {
  name: "company.get_brand_manual",
  description:
    "Recupera o manual de marca da empresa, incluindo diretrizes de identidade visual, tom de voz, personas e pilares de conteúdo.",
  type: "read_only",
  permission: "company.read",
  input_schema: GetBrandManualInputSchema,
  timeout: 15,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input, ctx) => {
    const targetCompanyId = input.company_id || ctx.company_id;

    if (!targetCompanyId) {
      return {
        brand_name: "Qualify",
        tone_of_voice: "Profissional, pragmático e direto",
        positioning: "Tecnologia de ponta para qualificação e crescimento.",
      };
    }

    try {
      const { data: workspaces } = await (supabase as any)
        .from("sprint_os_workspaces")
        .select("id, name, data, updated_at")
        .eq("company_id", targetCompanyId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false });

      if (Array.isArray(workspaces)) {
        for (const ws of workspaces) {
          const bm = ws?.data?.brandManual;
          if (bm) {
            const hasAnswers = (bm.fields || []).some((f: any) => {
              const resp = f?.response || f?.value || "";
              return typeof resp === "string" && resp.trim().length > 0;
            });
            if (hasAnswers || bm.overallStatus === "completed" || bm.masterPrompt) {
              return bm;
            }
          }
        }
        if (workspaces[0]?.data?.brandManual) {
          return workspaces[0].data.brandManual;
        }
      }
    } catch {
      // Fallback
    }

    return {
      company_id: targetCompanyId,
      tone_of_voice: "Autoridade, clareza e ritmo dinâmico",
      guidelines: "Sem jargões desnecessários, foco em resultados práticos.",
    };
  },
};
