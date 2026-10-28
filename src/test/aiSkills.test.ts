import { describe, it, expect } from "vitest";
import { resolveSkillSlugForAction, getAllActions, ACTION_REGISTRY } from "@/services/ai/actionRegistry";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import JSZip from "jszip";

describe("Criafy AI Skills & Action Registry", () => {
  it("resolves all defined actions to the expected global skill slugs", () => {
    expect(resolveSkillSlugForAction("generate_reel")).toBe("reel-scriptwriter");
    expect(resolveSkillSlugForAction("generate_stories_lite")).toBe("stories-lite");
    expect(resolveSkillSlugForAction("generate_carousel")).toBe("carousel-writer");
    expect(resolveSkillSlugForAction("generate_static_post")).toBe("static-post-writer");
    expect(resolveSkillSlugForAction("plan_week")).toBe("editorial-planner");
    expect(resolveSkillSlugForAction("strategist_chat")).toBe("digital-strategist");
  });

  it("returns the input string if action is already a skill slug", () => {
    expect(resolveSkillSlugForAction("custom-new-skill")).toBe("custom-new-skill");
  });

  it("lists all available registered actions with categories and descriptions", () => {
    const actions = getAllActions();
    expect(actions.length).toBeGreaterThanOrEqual(6);
    expect(actions.some((a) => a.action === "generate_reel")).toBe(true);
    expect(actions.some((a) => a.action === "generate_stories_lite")).toBe(true);
  });
});

describe("AIExecutionService ZIP Validation & Bundle Generation", () => {
  it("rejects a ZIP bundle that does not contain SKILL.md", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "Arquivo sem skill");
    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "invalid-bundle.zip");

    await expect(AIExecutionService.importZipSkill(file)).rejects.toThrow(
      "O arquivo .zip deve conter obrigatoriamente um arquivo 'SKILL.md'."
    );
  });

  it("successfully parses and validates a ZIP bundle containing SKILL.md", async () => {
    const zip = new JSZip();
    zip.file(
      "SKILL.md",
      `---
title: Teste Skill
description: Descrição da Skill de Teste
---
# Teste Skill
Conteúdo das instruções.`
    );
    zip.file("references/guia.md", "# Guia de Apoio");

    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "valid-skill.zip");

    const parsed = await AIExecutionService.importZipSkill(file);
    expect(parsed.name).toBe("Teste Skill");
    expect(parsed.description).toBe("Descrição da Skill de Teste");
    expect(parsed.files.length).toBe(2);
    expect(parsed.files.some((f) => f.name === "SKILL.md" && f.type === "manifest")).toBe(true);
    expect(parsed.files.some((f) => f.name === "guia.md" && f.type === "reference")).toBe(true);
  });

  it("generates a downloadable ZIP bundle with SKILL.md and reference files", async () => {
    const mockSkill: any = {
      id: "skill-123",
      slug: "reel-scriptwriter",
      name: "Roteirista de Reels",
      main_instructions: "Instruções do reel",
    };

    const mockVersion: any = {
      id: "v-1",
      version: 1,
      manifest_content: "# Roteirista de Reels\nInstruções...",
      files: [
        { path: "SKILL.md", name: "SKILL.md", type: "manifest", content: "# Manifest" },
        { path: "references/hooks.md", name: "hooks.md", type: "reference", content: "# Hooks" },
      ],
    };

    const blob = await AIExecutionService.exportSkillZip(mockSkill, mockVersion);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);

    const reloaded = new JSZip();
    const contents = await reloaded.loadAsync(blob);
    expect(contents.files["SKILL.md"]).toBeDefined();
    expect(contents.files["references/hooks.md"]).toBeDefined();
  });
});
