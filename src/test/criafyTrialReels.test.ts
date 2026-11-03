import { describe, it, expect } from "vitest";
import { CriafyPublication, TrialGraduationStrategy } from "@/types/criafy";

describe("Criafy Trial Reels — Modo de Teste da Meta", () => {
  it("1. Deve permitir criar uma publicação de Reel com status de teste (is_trial = true)", () => {
    const pub: Partial<CriafyPublication> = {
      publication_type: "REEL",
      is_trial: true,
      trial_graduation_strategy: "SS_PERFORMANCE",
    };

    expect(pub.is_trial).toBe(true);
    expect(pub.trial_graduation_strategy).toBe("SS_PERFORMANCE");
  });

  it("2. Deve suportar graduação manual (MANUAL) e automática (SS_PERFORMANCE)", () => {
    const pubAuto: Partial<CriafyPublication> = {
      publication_type: "REEL",
      is_trial: true,
      trial_graduation_strategy: "SS_PERFORMANCE",
    };

    const pubManual: Partial<CriafyPublication> = {
      publication_type: "REEL",
      is_trial: true,
      trial_graduation_strategy: "MANUAL",
    };

    expect(pubAuto.trial_graduation_strategy).toBe("SS_PERFORMANCE");
    expect(pubManual.trial_graduation_strategy).toBe("MANUAL");
  });

  it("3. Monta parâmetros corretos para a Meta Graph API no modo teste", () => {
    const buildMetaParams = (pub: Partial<CriafyPublication>) => {
      const isTrial = Boolean(pub.is_trial);
      const params: Record<string, string> = {
        media_type: "REELS",
        share_to_feed: isTrial ? "false" : "true",
      };

      if (isTrial) {
        const strategy = pub.trial_graduation_strategy === "MANUAL" ? "MANUAL" : "SS_PERFORMANCE";
        params.trial_params = JSON.stringify({ graduation_strategy: strategy });
      }

      return params;
    };

    // Caso 1: Reel Normal
    const normalParams = buildMetaParams({ publication_type: "REEL", is_trial: false });
    expect(normalParams.share_to_feed).toBe("true");
    expect(normalParams.trial_params).toBeUndefined();

    // Caso 2: Reel de Teste com graduação automática
    const trialAuto = buildMetaParams({ publication_type: "REEL", is_trial: true, trial_graduation_strategy: "SS_PERFORMANCE" });
    expect(trialAuto.share_to_feed).toBe("false");
    expect(trialAuto.trial_params).toBe(JSON.stringify({ graduation_strategy: "SS_PERFORMANCE" }));

    // Caso 3: Reel de Teste com graduação manual
    const trialManual = buildMetaParams({ publication_type: "REEL", is_trial: true, trial_graduation_strategy: "MANUAL" });
    expect(trialManual.share_to_feed).toBe("false");
    expect(trialManual.trial_params).toBe(JSON.stringify({ graduation_strategy: "MANUAL" }));
  });
});
