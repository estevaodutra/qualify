import { ContextProviderDefinition } from "../schemas";
import { supabase } from "@/integrations/supabase/client";
import { isBrandManualPopulated } from "@/services/criafy/criafySeedContentService";

export interface ResolvedBrandManualContext {
  company_id: string;
  brand_name: string;
  tone_of_voice: string;
  positioning: string;
  thesis?: string;
  answered_questions_count: number;
  is_populated: boolean;
  sections: {
    title: string;
    items: Array<{ question: string; answer: string }>;
  }[];
  summary_markdown: string;
}

/**
 * Extrai o Manual da Marca do Tenant a partir do Supabase ou Cache Local.
 */
export async function extractBrandManualForCompany(
  companyId: string
): Promise<ResolvedBrandManualContext> {
  let bestManual: any = null;
  let bestBrandName = "";
  let bestTone = "";
  let bestPositioning = "";

  // 1. Caso Empresa Demo
  if (companyId === "demo-company-1") {
    return {
      company_id: companyId,
      brand_name: "Qualify Demo",
      tone_of_voice: "Autoridade, direto, sem rodeios e focado em métricas",
      positioning: "Plataforma de inteligência e qualificação agêntica de ponta",
      thesis: "O fechamento ocorre pela clareza do processo, não por pressão.",
      answered_questions_count: 12,
      is_populated: true,
      sections: [
        {
          title: "Posicionamento & Mecanismo",
          items: [
            { question: "Mecanismo Único", answer: "Funil de qualificação agêntica orientada a dados." },
            { question: "Transformação Real", answer: "Transformar leads curiosos em clientes de alto valor." }
          ]
        },
        {
          title: "Raio-X do ICP",
          items: [
            { question: "Dor dos Inconformados", answer: "Perdem horas com curiosos e propostas sem retorno." }
          ]
        }
      ],
      summary_markdown: `### MANUAL DA MARCA: Qualify Demo\n**Tom de Voz:** Autoridade, direto.\n**Tese Central:** O fechamento ocorre pela clareza do processo.\n**Mecanismo Único:** Funil agêntico orientado a dados.`
    };
  }

  try {
    // 2. Buscar nos Workspaces ativos da empresa no Supabase
    const { data: workspaces } = await (supabase as any)
      .from("sprint_os_workspaces")
      .select("id, name, data, updated_at")
      .eq("company_id", companyId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    let bestAnsweredCount = 0;

    if (Array.isArray(workspaces)) {
      for (const ws of workspaces) {
        const bm = ws?.data?.brandManual;
        if (bm) {
          const fields = Array.isArray(bm.fields) ? bm.fields : [];
          const answered = fields.filter((f: any) => {
            const resp = f?.response || f?.value || f?.answer || f?.transcription || "";
            return typeof resp === "string" && resp.trim().length > 0 && !f.archived;
          });

          if (answered.length > bestAnsweredCount) {
            bestAnsweredCount = answered.length;
            bestManual = bm;
            bestBrandName = ws?.name || ws?.data?.name || ws?.data?.project?.name || "";
          } else if (!bestManual && isBrandManualPopulated(bm)) {
            bestManual = bm;
            bestBrandName = ws?.name || ws?.data?.name || ws?.data?.project?.name || "";
          }
        }
      }
    }

    // 3. Fallback no LocalStorage caso o usuário tenha editado e não sincronizado
    if (!bestManual && typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(`sprint_os_ws_${companyId}`) || key.startsWith("sprint_os_ws_"))) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || "{}");
            const bm = item?.brandManual;
            if (isBrandManualPopulated(bm)) {
              bestManual = bm;
              bestBrandName = item?.project?.name || item?.name || "Local Workspace";
              break;
            }
          } catch {}
        }
      }
    }

    // 4. Fallback em Criafy Account Briefings
    if (!bestManual) {
      const { data: briefings } = await (supabase as any)
        .from("criafy_account_briefings")
        .select("brand_name, tone_of_voice, brand_positioning")
        .limit(1);

      if (briefings && briefings.length > 0) {
        const b = briefings[0];
        bestManual = {
          brandName: b.brand_name,
          toneOfVoice: b.tone_of_voice,
          positioning: b.brand_positioning,
        };
        bestBrandName = b.brand_name || "";
        bestTone = b.tone_of_voice || "";
        bestPositioning = b.brand_positioning || "";
      }
    }
  } catch (err) {
    console.warn("[brandManualContext] Erro ao carregar manual da marca:", err);
  }

  // 5. Compilar campos respondidos em formato de seções e markdown legível
  const fields = Array.isArray(bestManual?.fields) ? bestManual.fields : [];
  const answeredFields = fields.filter((f: any) => {
    const val = f?.response || f?.value || f?.answer || f?.transcription || "";
    return typeof val === "string" && val.trim().length > 0 && !f.archived;
  });

  const sectionMap: Record<string, Array<{ question: string; answer: string }>> = {};

  answeredFields.forEach((f: any) => {
    const section = f.category || f.section || "Diretrizes Gerais";
    if (!sectionMap[section]) {
      sectionMap[section] = [];
    }
    const qTitle = f.label || f.title || f.question || "Questão";
    const answer = (f.response || f.value || f.answer || f.transcription || "").trim();
    sectionMap[section].push({ question: qTitle, answer });
  });

  const sections = Object.entries(sectionMap).map(([title, items]) => ({
    title,
    items,
  }));

  const brandName = bestBrandName || bestManual?.brandName || "Marca Não Nomeada";
  const toneOfVoice = bestTone || bestManual?.toneOfVoice || "Autoridade, clareza e pragmatismo";
  const positioning = bestPositioning || bestManual?.positioning || bestManual?.mechanism || "";
  const thesis = bestManual?.thesis || bestManual?.masterPrompt || "";

  let summaryMarkdown = `### MANUAL DA MARCA: ${brandName}\n`;
  summaryMarkdown += `- **Tom de Voz:** ${toneOfVoice}\n`;
  if (positioning) summaryMarkdown += `- **Posicionamento & Mecanismo:** ${positioning}\n`;
  if (thesis) summaryMarkdown += `- **Tese Central:** ${thesis}\n`;
  summaryMarkdown += `\n#### PILARES E RESPOSTAS DO BRIEFING (${answeredFields.length} respondidos):\n`;

  sections.forEach((sec) => {
    summaryMarkdown += `\n**[${sec.title}]**\n`;
    sec.items.forEach((it) => {
      summaryMarkdown += `- **${it.question}:** ${it.answer}\n`;
    });
  });

  return {
    company_id: companyId,
    brand_name: brandName,
    tone_of_voice: toneOfVoice,
    positioning,
    thesis,
    answered_questions_count: answeredFields.length,
    is_populated: answeredFields.length > 0 || isBrandManualPopulated(bestManual),
    sections,
    summary_markdown: summaryMarkdown,
  };
}

/**
 * Context Provider oficial para o Manual da Marca do Tenant.
 */
export const companyBrandManualContextProvider: ContextProviderDefinition<ResolvedBrandManualContext> = {
  slug: "company_brand_manual",
  name: "Manual da Marca 7D do Tenant",
  description:
    "Recupera o manual de marca completo, incluindo posicionamento, mecanismo único, ICP (Inconformados, Frustrados, Desenvolvidos) e tom de voz.",
  cache_ttl_seconds: 60,
  resolve: async (params) => {
    return await extractBrandManualForCompany(params.company_id);
  },
};
