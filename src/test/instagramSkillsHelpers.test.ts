import { describe, it, expect } from "vitest";
import {
  humanizeInstagramText,
  lintInstagramCaption,
  analyzeReelBeats,
  calculateProfileScore,
  INSTAGRAM_HOOK_FORMULAS,
  PROFILE_RUBRIC,
} from "@/services/ai/instagram";

describe("Instagram Skills Suite - Helpers & Linters", () => {
  it("has 10+ hook formulas with valid examples and screen text", () => {
    expect(INSTAGRAM_HOOK_FORMULAS.length).toBeGreaterThanOrEqual(10);
    const first = INSTAGRAM_HOOK_FORMULAS[0];
    expect(first.name).toContain("Cost Confession");
    expect(first.on_screen).toBeDefined();
    expect(first.template).toBeDefined();
  });

  it("humanizes text by removing em-dashes and AI slop phrases", () => {
    const raw = "No mundo de hoje—é importante lembrar que vamos mergulhar nos segredos de vendas.";
    const result = humanizeInstagramText(raw);
    expect(result.cleanedText).not.toContain("—");
    expect(result.cleanedText).not.toContain("No mundo de hoje");
    expect(result.cleanedText).not.toContain("vamos mergulhar");
    expect(result.changesMade.length).toBeGreaterThan(0);
  });

  it("lints an Instagram caption and detects truncated text at 125 chars", () => {
    const shortCap = "Apenas uma legenda curta #vendas #b2b Comente QUERO.";
    const resShort = lintInstagramCaption(shortCap);
    expect(resShort.isTruncated).toBe(false);
    expect(resShort.hasSingleAsk).toBe(true);
    expect(resShort.hashtagCount).toBe(2);

    const longCap = "Esta é uma frase deliberadamente longa criada para ultrapassar com certeza absoluta o limite estrito de cento e vinte e cinco caracteres que o Instagram corta no feed antes do botão mais. #tag1 #tag2 #tag3 #tag4 #tag5 #tag6";
    const resLong = lintInstagramCaption(longCap);
    expect(resLong.isTruncated).toBe(true);
    expect(resLong.hashtagCount).toBe(6);
    expect(resLong.warnings.some((w) => w.includes("máximo 3 a 5"))).toBe(true);
  });

  it("analyzes Reel beats timing at 165 wpm", () => {
    const script = `Ninguém te conta que os seus primeiros 30 reels vão flopar.
O motivo é que o algoritmo não te conhece e você ainda não achou seu tom.
Em vez de desistir na segunda semana, poste duas vezes e responda comentários.
Comente MENTORIA para receber o passo a passo.`;

    const beatsResult = analyzeReelBeats(script, 165);
    expect(beatsResult.totalWords).toBeGreaterThan(20);
    expect(beatsResult.totalSeconds).toBeGreaterThan(5);
    expect(beatsResult.beats.length).toBe(4);
    expect(beatsResult.beats[0].type).toBe("HOOK");
    expect(beatsResult.beats[3].type).toBe("LOOP");
  });

  it("calculates profile audit score out of 100", () => {
    expect(PROFILE_RUBRIC.length).toBe(10);
    const fullAudit = calculateProfileScore(PROFILE_RUBRIC.map((r) => r.id));
    expect(fullAudit.score).toBe(100);
    expect(fullAudit.missingItems.length).toBe(0);

    const partialAudit = calculateProfileScore(["handle", "photo", "who_for"]);
    expect(partialAudit.score).toBe(30);
    expect(partialAudit.missingItems.length).toBe(7);
  });
});
