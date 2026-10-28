import { describe, it, expect } from "vitest";
import { resolveSkillSlugForAction, getAllActions, ACTION_REGISTRY } from "@/services/ai/actionRegistry";
import { AIExecutionService } from "@/services/ai/aiExecutionService";
import { SkillAutoDetector } from "@/services/ai/skillAutoDetector";
import JSZip from "jszip";

describe("Criafy AI Skills & Action Registry", () => {
  it("resolves all defined actions to the expected global skill slugs", () => {
    expect(resolveSkillSlugForAction("strategy_plan")).toBe("estrategista-digital");
    expect(resolveSkillSlugForAction("generate_reel")).toBe("roteirista-reels");
    expect(resolveSkillSlugForAction("generate_creative_direction")).toBe("designer-criativos");

    // Aliases
    expect(resolveSkillSlugForAction("strategist_chat")).toBe("estrategista-digital");
    expect(resolveSkillSlugForAction("generate_carousel")).toBe("designer-criativos");
    expect(resolveSkillSlugForAction("generate_static_post")).toBe("designer-criativos");
  });

  it("returns the input string if action is already a skill slug", () => {
    expect(resolveSkillSlugForAction("custom-new-skill")).toBe("custom-new-skill");
  });

  it("lists all available registered actions with categories and descriptions", () => {
    const actions = getAllActions();
    expect(actions.length).toBe(3);
    expect(actions.some((a) => a.action === "strategy_plan")).toBe(true);
    expect(actions.some((a) => a.action === "generate_reel")).toBe(true);
    expect(actions.some((a) => a.action === "generate_creative_direction")).toBe(true);
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

describe("SkillAutoDetector Automatic Identification", () => {
  it("automatically identifies a Carousel when input is a single .md with carousel cues", async () => {
    const mdContent = `---
title: Mestre do Carrossel
description: Skill para criação de carrosséis de 7 lâminas educativas
---
# Mestre do Carrossel

## Objetivo
Criar slides educativos e dinâmicos para carrossel do Instagram.
Instruções para estruturar cada slide com retenção slide a slide.

## Hooks
Ganchos de capa para fazer a pessoa arrastar para o lado.`;

    const file = new File([mdContent], "carrossel-viral.md", { type: "text/markdown" });

    const result = await SkillAutoDetector.detectFromInput({ singleFile: file });
    expect(result.sourceType).toBe("SINGLE_MD");
    expect(result.detectedFormat).toBe("CARROSSEL");
    expect(result.category).toBe("CONTEÚDO");
    expect(result.default_model_profile).toBe("CONTENT_ADVANCED");
    expect(result.output_schema.slides).toBeDefined();
    expect(result.output_schema.cover_headline).toBeDefined();
    expect(result.files.some((f) => f.name === "SKILL.md")).toBe(true);
  });

  it("automatically identifies a folder of files and parses bundle structure", async () => {
    const file1 = new File(["# Manifesto"], "skill.md", { type: "text/markdown" });
    const file2 = new File(["# Referência de Hooks"], "references/hooks.md", { type: "text/markdown" });
    Object.defineProperty(file1, "webkitRelativePath", { value: "minha-skill/skill.md" });
    Object.defineProperty(file2, "webkitRelativePath", { value: "minha-skill/references/hooks.md" });

    const result = await SkillAutoDetector.detectFromInput({ fileList: [file1, file2] });
    expect(result.sourceType).toBe("FOLDER");
    expect(result.files.length).toBe(2);
    expect(result.files.some((f) => f.type === "manifest")).toBe(true);
  });

  it("automatically identifies a simple markdown file and builds complete setup", async () => {
    const mdContent = `# Roteiro de Vídeo Curto
Roteirize vídeos no formato Reels de 30 segundos com gancho provocativo e CTA.`;

    const file = new File([mdContent], "reels.md", { type: "text/markdown" });

    const result = await SkillAutoDetector.detectFromInput({ singleFile: file });
    expect(result.sourceType).toBe("SINGLE_MD");
    expect(result.detectedFormat).toBe("REEL");
    expect(result.output_schema.hook).toBeDefined();
    expect(result.output_schema.script).toBeDefined();
  });
});
