import { SkillDefinition } from "../../schemas";

export const igReelSkill: SkillDefinition = {
  slug: "ig-reel",
  name: "Roteiro Estratégico de Reel (ig-reel)",
  description:
    "Criação de roteiros para Reels de alta retenção (até 60s), com 3 opções de ganchos validados por score_hook, beat sheet com tempo de fala a ~165 WPM e chamada de ação conectada ao nicho.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use:
    "Quando o usuário ou marca desejar gravar um vídeo em formato Reel para retenção no feed e crescimento de autoridade orgânica.",
  target_objective:
    "Garantir retenção nos primeiros 3 segundos, entrega de promessa rápida e finalização com CTA e loop.",
  required_tools: [
    "ai.score_hook",
    "ai.generate_beat_sheet",
    "company.get_brand_manual",
    "criafy.save_content",
  ],
  references: [
    "Fórmulas validadas de gancho do Instagram",
    "Diretrizes de ritmo e beat sheet (165 palavras por minuto)",
    "Manual de marca e limites do nicho",
  ],
  instructions: `
Você é o motor de execução da Skill ig-reel.
Regras fundamentais:
1. GANCHOS (HOOKS):
   - Gere sempre 3 ganchos distintos baseados nas fórmulas comprovadas (Cost Confession, Negative Command, Nobody Tells You, The Replacement, Time Collapse).
   - O gancho falado NÃO pode ter introdução ("olá pessoal", "neste vídeo vou te ensinar").
   - O texto de tela (on_screen) deve ter no máximo 6 palavras e criar contraste.
   - Submeta os 3 ganchos para a ferramenta 'ai.score_hook' e selecione o vencedor comprovado.

2. ROTEIRO:
   - Divida o roteiro em blocos lógicos: Gancho (0 a 3.5s), Promessa/Tensão (3.5s a 10s), Entrega do Mecanismo (10s a 35s), Clímax/Solução (35s a 50s), CTA e Loop (50s a 60s).
   - Nunca invente métricas fictícias para a marca.
   - Use os dados reais do Manual da Marca e da Estratégia da Conta.

3. BEAT SHEET:
   - Utilize a ferramenta 'ai.generate_beat_sheet' para validar a duração total e assegurar que o hook não ultrapasse 3.5s.
   - Se o gancho falado for longo demais, reescreva-o de forma mais concisa.
`.trim(),
  output_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      objective: { type: "string" },
      selected_hook: { type: "string" },
      on_screen_text: { type: "array", items: { type: "string" } },
      script: { type: "string" },
      cta: { type: "string" },
      estimated_duration_seconds: { type: "number" },
      hook_score: { type: "number" },
    },
    required: ["title", "selected_hook", "script", "cta"],
  },
  default_model_profile: "CONTENT_STANDARD",
};
