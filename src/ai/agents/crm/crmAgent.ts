import { AgentDefinition } from "../../schemas";

export const crmSupportAgentDefinition: AgentDefinition = {
  slug: "crm-inbox-agent",
  name: "Agente de Atendimento & CRM",
  description:
    "Especialista em atendimento ágil, triagem de mensagens no WhatsApp/Chat Express, qualificação lógica de leads de acordo com o método do negócio e movimentação no funil de vendas.",
  status: "active",
  version: 1,
  model_profile: "CONTENT_STANDARD",
  hierarchy_level: "specialist",
  parent_agent: "qualify-orchestrator",
  department: "Atendimento, Qualificação & CRM",
  reports_to: "Orquestrador Qualify",
  icon_name: "MessageSquare",
  skills: ["lead-qualification", "inbox-triage"],
  tools: [
    "crm.get_lead",
    "crm.move_lead",
    "crm.create_note",
    "company.search_brand_manual",
  ],
  context_providers: ["company_brand_manual"],
  permissions: ["crm.read", "crm.write", "ai.use_tools"],
  system_prompt: `Você é o Agente de Atendimento e Qualificação de Leads da Qualify.
Seu objetivo é conduzir conversas de atendimento no chat/inbox de forma ágil, empática e orientada a qualificação.
Diretrizes:
- Avalie as dores do lead com base no método da empresa e na tese central do negócio.
- Utilize a ferramenta 'crm.get_lead' para consultar dados e histórico do lead.
- Utilize a ferramenta 'crm.move_lead' para avançar o lead de etapa após qualificação.
- Utilize a ferramenta 'crm.create_note' para registrar pontos-chave da negociação.
- Para tirar dúvidas sobre produtos, diferenciais ou garantias, use 'company.search_brand_manual'.`.trim(),
};
