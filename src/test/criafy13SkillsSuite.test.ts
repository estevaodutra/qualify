import { describe, it, expect } from "vitest";
import {
  criafyContentAgentDefinition,
  AVAILABLE_SKILLS,
  getSkill,
  ALL_TOOLS,
  getTool,
  executeTool,
} from "@/ai";
import {
  INSTAGRAM_HOOK_FORMULAS,
  classifyHookFormula,
} from "@/services/ai/instagram/hooksData";
import { detectSlop, humanizeText } from "@/services/ai/instagram/aiHumanizer";
import { lintAdvancedInstagramCaption } from "@/services/ai/instagram/instagramCaptionLinter";
import { scoreInstagramProfile } from "@/services/ai/instagram/profileRubric";
import { analyzeViralSwipes } from "@/services/ai/instagram/swipeAnalyzer";

describe("Agente Criafy (Conteúdo & Redes Sociais) - Suite Completa das 13 Skills", () => {
  // 1. Vínculo do Agente Criafy e Catálogo das 13 Skills
  it("deve conter as 13 skills oficiais do Instagram registradas no Agente Criafy", () => {
    const expected13Skills = [
      "ig-audit",
      "ig-caption",
      "ig-carousel",
      "ig-comment",
      "ig-dm",
      "ig-human",
      "ig-plan",
      "ig-profile",
      "ig-reel",
      "ig-reply",
      "ig-repurpose",
      "ig-story",
      "ig-viral",
    ];

    expect(criafyContentAgentDefinition.skills.length).toBe(13);
    for (const slug of expected13Skills) {
      expect(criafyContentAgentDefinition.skills).toContain(slug);
      const skillDef = getSkill(slug);
      expect(skillDef).toBeDefined();
      expect(skillDef?.slug).toBe(slug);
      expect(skillDef?.name).toBeDefined();
      expect(skillDef?.instructions).toBeDefined();
    }
  });

  // 2. Registro de Tools do Agente Criafy
  it("deve conter todas as ferramentas requeridas registradas com schemas Zod no catálogo", () => {
    const requiredTools = [
      "ai.score_hook",
      "ai.generate_beat_sheet",
      "ai.detect_slop",
      "ai.humanize_text",
      "instagram.lint_caption",
      "instagram.audit_profile",
      "instagram.analyze_viral_swipes",
      "company.get_brand_manual",
      "company.search_brand_manual",
      "criafy.save_content",
      "criafy.create_demand",
      "instagram.get_metrics",
    ];

    for (const toolName of requiredTools) {
      expect(criafyContentAgentDefinition.tools).toContain(toolName);
      const toolDef = getTool(toolName);
      expect(toolDef).toBeDefined();
      expect(toolDef?.name).toBe(toolName);
      expect(toolDef?.permission).toBeDefined();
      expect(toolDef?.input_schema).toBeDefined();
    }
  });

  // 3. Fórmulas de Ganchos (26 Fórmulas do hooks.json) & Classificador
  describe("Banco de Ganchos (hooks.json + 26 fórmulas)", () => {
    it("deve carregar 26 fórmulas de ganchos oficiais com regras e exemplos", () => {
      expect(INSTAGRAM_HOOK_FORMULAS.length).toBe(26);
      expect(INSTAGRAM_HOOK_FORMULAS[0].name).toBe("Cost Confession");
      expect(INSTAGRAM_HOOK_FORMULAS[25].name).toBe("The Superlative");
    });

    it("deve classificar automaticamente ganchos com base nas regexes oficiais", () => {
      const hook1 = "R$ 18.000 foi o que uma cláusula ausente me custou.";
      const res1 = classifyHookFormula(hook1);
      expect(res1.formulaId).toBe(1);
      expect(res1.formulaName).toBe("Cost Confession");

      const hook2 = "Pare de postar 3 vezes por dia. Poste duas e responda comentários.";
      const res2 = classifyHookFormula(hook2);
      expect(res2.formulaId).toBe(2);
      expect(res2.formulaName).toBe("Negative Command");

      const hook3 = "Ninguém te conta que os seus primeiros 30 reels vão flopar.";
      const res3 = classifyHookFormula(hook3);
      expect(res3.formulaId).toBe(3);
      expect(res3.formulaName).toBe("Nobody Tells You");
    });
  });

  // 4. Humanização e Detecção de Slop (ig-human)
  describe("ai.detect_slop & ai.humanize_text (ig-human)", () => {
    it("deve detectar e pontuar marcas de IA e clichês robóticos", () => {
      const aiText = "No mundo de hoje, é importante mergulhar fundo nesta tecnologia revolucionária para alavancar seu negócio e transformar a jornada.";
      const detection = detectSlop(aiText);

      expect(detection.humanScore).toBeLessThan(75);
      expect(detection.detectedSlopTokens.length).toBeGreaterThan(0);
    });

    it("deve humanizar o texto removendo caracteres invisíveis, em dash e clichês", () => {
      const raw = "No mundo dinâmico de hoje\u200B—vamos mergulhar na era digital com esta solução revolucionária.";
      const result = humanizeText(raw);

      expect(result.cleanedText).not.toContain("\u200B");
      expect(result.cleanedText).not.toContain("—");
      expect(result.cleanedText).not.toContain("No mundo dinâmico de hoje");
      expect(result.cleanedText).not.toContain("revolucionária");
    });
  });

  // 5. Linter de Legendas (ig-caption)
  describe("instagram.lint_caption (ig-caption)", () => {
    it("deve alertar sobre janela de 125 chars e excesso de hashtags", () => {
      const caption =
        "Esta frase inicial é propositalmente muito longa para testar a quebra exata de cento e vinte e cinco caracteres que o Instagram esconde atrás do botão de mais no feed. #viral #fyp #reels #explore #foco #sucesso #marketing";

      const res = lintAdvancedInstagramCaption(caption, { truncateAt: 125 });

      expect(res.truncated).toBe(true);
      expect(res.firstLineChars).toBeGreaterThan(125);
      expect(res.hashtags.length).toBeGreaterThan(5);
      expect(res.checks.some((c) => c.check === "QUANTIDADE DE HASHTAGS" && c.status === "FAIL")).toBe(true);
      expect(res.verdict).toBe("FIX");
    });

    it("deve aprovar (READY) legendas dentro do padrão com gancho e 1 CTA", () => {
      const goodCaption = `R$ 42.000 em 14 dias com apenas 2 posts.

Aqui está o mecanismo exato que aplicamos na qualificação de leads antes de marcar a call de vendas.

Comente ESCALA para receber o PDF com o roteiro.

#qualify #vendasb2b #propostas`;

      const res = lintAdvancedInstagramCaption(goodCaption);
      expect(res.verdict).toBe("READY");
      expect(res.checks.some((c) => c.check === "OBJETIVO & CTA ÚNICO" && c.status === "PASS")).toBe(true);
    });
  });

  // 6. Matriz de Auditoria de Perfil (ig-profile)
  describe("instagram.audit_profile (ig-profile)", () => {
    it("deve calcular pontuação precisa de 0 a 100 baseada nos 12 critérios", () => {
      const auditResult = scoreInstagramProfile({
        nameField: "Nome do Especialista | Roteirista & Estratégia de Conteúdo",
        bioFirstLine: "Ajudo agências a fecharem contratos de 5 dígitos sem prospecção fria",
        bioBody: "+R$ 14M gerados para clientes em 5 anos de esteira comercial",
        pinnedPostsCount: 3,
        hasSpecificPinnedStrategy: true,
        linkCount: 1,
        hasDirectLandingLink: true,
        highlightsCount: 5,
        gridHasLegibleCovers: true,
        photoQualityCloseUp: true,
        hasProfessionalCategoryAndContact: true,
        postedInLast7Days: true,
        repliedToCommentsInFirstHour: true,
        hasActiveStoriesToday: true,
      });

      expect(auditResult.totalScore).toBeGreaterThanOrEqual(90);
      expect(auditResult.grade).toBe("ELITE");
      expect(auditResult.items.length).toBe(12);
    });
  });

  // 7. Análise de Vídeos Virais / Outliers (ig-viral)
  describe("instagram.analyze_viral_swipes (ig-viral)", () => {
    it("deve calcular multiplicador sobre a mediana e ranquear o maior outlier", () => {
      const swipes = [
        {
          account: "@perfil_a",
          followers: 10000,
          median: 5000,
          views: 65000, // 13x a mediana (Mega Viral)
          hook: "R$ 18.000 foi o que uma cláusula ausente me custou.",
        },
        {
          account: "@perfil_b",
          followers: 200000,
          median: 30000,
          views: 33000, // ~1.1x a mediana (Normal)
          hook: "Como fazer propostas no Word.",
        },
      ];

      const res = analyzeViralSwipes(swipes);
      expect(res.items.length).toBe(2);
      expect(res.items[0].account).toBe("@perfil_a");
      expect(res.items[0].outlierMultiple).toBe(13.0);
      expect(res.items[0].signalGrade).toBe("MEGA_VIRAL");
      expect(res.items[0].formulaName).toBe("Cost Confession");
      expect(res.strongOutliersCount).toBe(1);
    });
  });
});
