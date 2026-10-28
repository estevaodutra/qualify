import JSZip from "jszip";
import { AiSkillCategory, AiSkillFile, AiSkillStatus } from "@/types/aiSkills";

export type DetectedFormat =
  | "CARROSSEL"
  | "REEL"
  | "STORIES"
  | "POST_ESTATICO"
  | "PLANEJAMENTO"
  | "ESTRATEGIA"
  | "ANALISE"
  | "GERAL";

export type DetectedSourceType = "ZIP_BUNDLE" | "FOLDER" | "SINGLE_MD" | "TEXT";

export interface SkillAutoDetectionResult {
  sourceType: DetectedSourceType;
  detectedFormat: DetectedFormat;
  formatLabel: string;
  name: string;
  slug: string;
  description: string;
  category: AiSkillCategory;
  when_to_use: string;
  target_objective: string;
  main_instructions: string;
  output_format: "json" | "markdown" | "text";
  output_schema: Record<string, any>;
  default_model_profile: string;
  status: AiSkillStatus;
  files: AiSkillFile[];
  manifest_content: string;
  confidenceNotes: string[];
}

export const SkillAutoDetector = {
  /**
   * Helper seguro para ler texto em qualquer ambiente (Browser, Node, JSDOM)
   */
  async readTextFromFile(file: File | Blob): Promise<string> {
    if (typeof (file as any).text === "function") {
      try {
        return await (file as any).text();
      } catch {
        // Fallback below
      }
    }
    if (typeof Response !== "undefined") {
      try {
        return await new Response(file).text();
      } catch {
        // Fallback below
      }
    }
    return new Promise((resolve, reject) => {
      if (typeof FileReader !== "undefined") {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      } else {
        resolve("");
      }
    });
  },

  /**
   * Identifica automaticamente se é Carrossel, se é pasta ou se é só .md,
   * e gera todo o setup completo e pronto para persistência.
   */
  async detectFromInput(params: {
    singleFile?: File;
    fileList?: File[];
  }): Promise<SkillAutoDetectionResult> {
    const { singleFile, fileList } = params;

    // 1. Caso A: Arquivo .zip
    if (singleFile && singleFile.name.toLowerCase().endsWith(".zip")) {
      return this.detectFromZip(singleFile);
    }

    // 2. Caso B: Múltiplos arquivos ou Pasta (webkitdirectory)
    if (fileList && fileList.length > 1) {
      return this.detectFromFolderFiles(fileList);
    }

    // 3. Caso C: Arquivo .md ou .txt avulso
    const targetFile = singleFile || fileList?.[0];
    if (targetFile) {
      return this.detectFromSingleMd(targetFile);
    }

    throw new Error("Nenhum arquivo ou pasta fornecido para análise.");
  },

  /**
   * Processamento e detecção a partir de um arquivo .md único
   */
  async detectFromSingleMd(file: File): Promise<SkillAutoDetectionResult> {
    const rawContent = await this.readTextFromFile(file);
    const rawName = file.name.replace(/\.(md|markdown|txt)$/i, "");

    const extracted = this.extractFromMarkdownText(rawContent, rawName);
    const classification = this.classifyContent(rawContent, rawName);

    const manifestContent = extracted.manifestContent;
    const files: AiSkillFile[] = [
      {
        path: "SKILL.md",
        name: "SKILL.md",
        type: "manifest",
        content: manifestContent,
        size: manifestContent.length,
        updatedAt: new Date().toISOString(),
      },
    ];

    // Se no markdown houver referências ou exemplos claros separados por seções, extrai para references/
    const subReferences = this.extractSubSections(rawContent);
    if (subReferences.length > 0) {
      files.push(...subReferences);
    }

    return {
      sourceType: "SINGLE_MD",
      detectedFormat: classification.format,
      formatLabel: classification.label,
      name: extracted.name || classification.fallbackName,
      slug: this.generateSlug(extracted.name || rawName),
      description: extracted.description || classification.fallbackDescription,
      category: classification.category,
      when_to_use: extracted.whenToUse || classification.whenToUse,
      target_objective: extracted.objective || classification.targetObjective,
      main_instructions: extracted.instructions || rawContent,
      output_format: "json",
      output_schema: classification.outputSchema,
      default_model_profile: classification.suggestedProfile,
      status: "published",
      files,
      manifest_content: manifestContent,
      confidenceNotes: [
        `Arquivo único .md identificado (${file.name})`,
        `Classificado automaticamente como: ${classification.label}`,
        `Schema JSON gerado sob medida para ${classification.label}`,
        `SKILL.md montado com frontmatter compatível`,
      ],
    };
  },

  /**
   * Processamento e detecção a partir de uma Pasta inteira (múltiplos arquivos)
   */
  async detectFromFolderFiles(files: File[]): Promise<SkillAutoDetectionResult> {
    const skillFiles: AiSkillFile[] = [];
    let primaryMdContent = "";
    let primaryMdName = "";

    // Procura primeiro por SKILL.md ou README.md
    for (const f of files) {
      const path = (f as any).webkitRelativePath || f.name;
      // Ignora arquivos do sistema operacional
      if (path.includes("__MACOSX") || path.includes(".DS_Store")) continue;

      const content = await this.readTextFromFile(f);
      const fileName = f.name;
      let type: "manifest" | "reference" | "asset" | "script" = "reference";

      if (fileName.toLowerCase() === "skill.md" || (!primaryMdContent && fileName.toLowerCase().endsWith(".md"))) {
        if (fileName.toLowerCase() === "skill.md") {
          type = "manifest";
          primaryMdContent = content;
          primaryMdName = "SKILL.md";
        } else if (!primaryMdContent) {
          primaryMdContent = content;
          primaryMdName = fileName;
        }
      } else if (path.includes("references/") || path.includes("references\\")) {
        type = "reference";
      } else if (path.includes("assets/") || path.includes("assets\\")) {
        type = "asset";
      } else if (path.includes("scripts/") || path.includes("scripts\\")) {
        type = "script";
      }

      skillFiles.push({
        path: path.replace(/^[^\/]+\//, ""), // Remove o nome da pasta raiz se houver
        name: fileName,
        type,
        content,
        size: content.length,
        updatedAt: new Date().toISOString(),
      });
    }

    // Se nenhum SKILL.md explícito foi encontrado, eleva o primeiro .md
    if (!primaryMdContent && skillFiles.length > 0) {
      const firstMd = skillFiles.find((f) => f.name.endsWith(".md")) || skillFiles[0];
      primaryMdContent = firstMd.content;
      firstMd.type = "manifest";
      firstMd.path = "SKILL.md";
      firstMd.name = "SKILL.md";
    }

    const folderName = files[0] && (files[0] as any).webkitRelativePath
      ? (files[0] as any).webkitRelativePath.split("/")[0]
      : "skill-folder";

    const allCombinedText = skillFiles.map((f) => f.content).join("\n\n");
    const classification = this.classifyContent(allCombinedText, folderName);
    const extracted = this.extractFromMarkdownText(primaryMdContent, folderName);

    return {
      sourceType: "FOLDER",
      detectedFormat: classification.format,
      formatLabel: `${classification.label} (Pasta com ${skillFiles.length} arquivos)`,
      name: extracted.name || classification.fallbackName,
      slug: this.generateSlug(extracted.name || folderName),
      description: extracted.description || classification.fallbackDescription,
      category: classification.category,
      when_to_use: extracted.whenToUse || classification.whenToUse,
      target_objective: extracted.objective || classification.targetObjective,
      main_instructions: extracted.instructions || primaryMdContent,
      output_format: "json",
      output_schema: classification.outputSchema,
      default_model_profile: classification.suggestedProfile,
      status: "published",
      files: skillFiles,
      manifest_content: primaryMdContent,
      confidenceNotes: [
        `Pasta estruturada detectada com ${skillFiles.length} arquivo(s)`,
        `Especialidade inferida: ${classification.label}`,
        `Perfil sugerido: ${classification.suggestedProfile}`,
      ],
    };
  },

  /**
   * Processamento e detecção a partir de um arquivo .zip
   */
  async detectFromZip(zipFile: File): Promise<SkillAutoDetectionResult> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);

    const skillFiles: AiSkillFile[] = [];
    let manifestContent = "";
    let primaryName = zipFile.name.replace(/\.zip$/i, "");

    const entries = Object.keys(contents.files);
    for (const relativePath of entries) {
      const entry = contents.files[relativePath];
      if (entry.dir) continue;
      if (relativePath.includes("__MACOSX") || relativePath.includes(".DS_Store")) continue;

      const fileName = relativePath.split("/").pop() || relativePath;
      const content = await entry.async("string");
      let type: "manifest" | "reference" | "asset" | "script" = "reference";

      if (fileName.toLowerCase() === "skill.md") {
        type = "manifest";
        manifestContent = content;
      } else if (relativePath.startsWith("references/")) {
        type = "reference";
      } else if (relativePath.startsWith("assets/")) {
        type = "asset";
      } else if (relativePath.startsWith("scripts/")) {
        type = "script";
      }

      skillFiles.push({
        path: relativePath,
        name: fileName,
        type,
        content,
        size: content.length,
        updatedAt: new Date().toISOString(),
      });
    }

    if (!manifestContent && skillFiles.length > 0) {
      const firstMd = skillFiles.find((f) => f.name.toLowerCase().endsWith(".md")) || skillFiles[0];
      manifestContent = firstMd.content;
      firstMd.type = "manifest";
      firstMd.path = "SKILL.md";
      firstMd.name = "SKILL.md";
    }

    const allCombinedText = skillFiles.map((f) => f.content).join("\n\n");
    const classification = this.classifyContent(allCombinedText, primaryName);
    const extracted = this.extractFromMarkdownText(manifestContent, primaryName);

    return {
      sourceType: "ZIP_BUNDLE",
      detectedFormat: classification.format,
      formatLabel: `${classification.label} (Bundle .zip)`,
      name: extracted.name || classification.fallbackName,
      slug: this.generateSlug(extracted.name || primaryName),
      description: extracted.description || classification.fallbackDescription,
      category: classification.category,
      when_to_use: extracted.whenToUse || classification.whenToUse,
      target_objective: extracted.objective || classification.targetObjective,
      main_instructions: extracted.instructions || manifestContent,
      output_format: "json",
      output_schema: classification.outputSchema,
      default_model_profile: classification.suggestedProfile,
      status: "published",
      files: skillFiles,
      manifest_content: manifestContent,
      confidenceNotes: [
        `Bundle compactado .zip processado com sucesso (${skillFiles.length} arquivos)`,
        `Especialidade identificada: ${classification.label}`,
        `Perfil configurado: ${classification.suggestedProfile}`,
      ],
    };
  },

  /**
   * Classifica o formato (Carrossel, Reels, Stories, Post, Estratégia) com base em palavras-chave e semântica
   */
  classifyContent(text: string, titleHint: string) {
    const lower = `${titleHint} ${text}`.toLowerCase();

    // 1. CARROSSEL
    const isCarousel =
      lower.includes("carrossel") ||
      lower.includes("carousel") ||
      lower.includes("lâmina") ||
      lower.includes("laminas") ||
      lower.includes("slides") ||
      lower.includes("slide 1") ||
      lower.includes("arraste para o lado") ||
      lower.includes("arraste pro lado");

    if (isCarousel) {
      return {
        format: "CARROSSEL" as DetectedFormat,
        label: "Carrossel de Conteúdo",
        category: "CONTEÚDO" as AiSkillCategory,
        suggestedProfile: "CONTENT_ADVANCED",
        fallbackName: "Criador de Carrosséis",
        fallbackDescription: "Estruturação de carrosséis educativos em lâminas com alta retenção e salvamentos.",
        whenToUse: "Quando o usuário solicitar conteúdo em múltiplos slides/lâminas para feed do Instagram.",
        targetObjective: "Reter slide a slide e gerar salvamento e compartilhamento do carrossel.",
        outputSchema: {
          cover_headline: "string (título magnético da capa)",
          cover_subheadline: "string (subtítulo complementar que instiga o deslize)",
          slides: [
            {
              slide_number: 1,
              title: "string (título da lâmina)",
              content: "string (texto claro e escaneável)",
              visual_cue: "string (orientação de design ou elemento visual da lâmina)"
            }
          ],
          caption: "string (legenda complementar para publicação)",
          cta: "string (chamada no slide final)"
        },
      };
    }

    // 2. REELS / VÍDEOS VERTICAIS
    const isReel =
      lower.includes("reel") ||
      lower.includes("reels") ||
      lower.includes("tiktok") ||
      lower.includes("shorts") ||
      lower.includes("vídeo vertical") ||
      lower.includes("3 segundos") ||
      lower.includes("gancho") ||
      lower.includes("rubrica") ||
      lower.includes("roteiro falado");

    if (isReel) {
      return {
        format: "REEL" as DetectedFormat,
        label: "Roteiro de Reels / Vídeo Vertical",
        category: "CONTEÚDO" as AiSkillCategory,
        suggestedProfile: "CONTENT_ADVANCED",
        fallbackName: "Roteirista de Reels",
        fallbackDescription: "Roteiros dinâmicos de alta retenção para vídeos verticais (Reels/TikTok).",
        whenToUse: "Quando for necessário criar roteiro de vídeo curto com gancho de 3 segundos.",
        targetObjective: "Reter a atenção nos primeiros 3s e conduzir para CTA contextual.",
        outputSchema: {
          title: "string",
          objective: "string",
          hook: "string (frase de gancho para os primeiros 3s)",
          script: "string (roteiro falado completo com rubricas visuais entre colchetes)",
          cta: "string (chamada para ação)",
          recording_notes: "string (orientações de enquadramento e voz)",
          caption: "string (legenda para o post)"
        },
      };
    }

    // 3. STORIES LITE / ROTINA
    const isStories =
      lower.includes("stories") ||
      lower.includes("story") ||
      lower.includes("stories lite") ||
      lower.includes("bastidores") ||
      lower.includes("café") ||
      lower.includes("cotidiano") ||
      lower.includes("rotina");

    if (isStories) {
      return {
        format: "STORIES" as DetectedFormat,
        label: "Stories Lite & Rotina",
        category: "CONTEÚDO" as AiSkillCategory,
        suggestedProfile: "CONTENT_STANDARD",
        fallbackName: "Stories Lite",
        fallbackDescription: "Oportunidades leves de comunicação espontânea conectando rotina ao produto.",
        whenToUse: "Para criar sequências de Stories autênticas e naturais sem parecer anúncio.",
        targetObjective: "Gerar identificação e conversas espontâneas na DM.",
        outputSchema: {
          context: "string (café, carro, trabalho, casa, bastidor, fim de dia)",
          trigger: "string (o fato que despertou o story)",
          hook: "string (abertura)",
          bridge: "string (ponte para o aprendizado)",
          message: "string (mensagem central)",
          method_connection: "string (conexão com o método/marca)",
          cta: "string (pergunta ou convite)",
          script: "string (roteiro pronto para gravar)"
        },
      };
    }

    // 4. ESTRATÉGIA / PLANEJAMENTO EDITORIAL
    const isStrategy =
      lower.includes("estratégia") ||
      lower.includes("planejamento") ||
      lower.includes("editorial") ||
      lower.includes("diagnóstico") ||
      lower.includes("posicionamento") ||
      lower.includes("pautas") ||
      lower.includes("calendário");

    if (isStrategy) {
      return {
        format: "ESTRATEGIA" as DetectedFormat,
        label: "Estratégia & Planejamento",
        category: "ESTRATÉGIA" as AiSkillCategory,
        suggestedProfile: "STRATEGY_ADVANCED",
        fallbackName: "Estrategista de Conteúdo",
        fallbackDescription: "Planejamento editorial, linha de posicionamento e direcionamento tático.",
        whenToUse: "Para estruturar calendários, pautas e consultoria de posicionamento.",
        targetObjective: "Garantir coerência estratégica e consistência de autoridade.",
        outputSchema: {
          diagnosis: "string (diagnóstico do cenário)",
          recommendations: [
            {
              area: "string",
              action: "string",
              expected_impact: "string",
              priority: "string"
            }
          ],
          next_steps: ["string"],
          summary: "string"
        },
      };
    }

    // 5. ANÁLISE / MÉTRICAS
    const isAnalysis =
      lower.includes("análise") ||
      lower.includes("metricas") ||
      lower.includes("kpi") ||
      lower.includes("performance") ||
      lower.includes("icp");

    if (isAnalysis) {
      return {
        format: "ANALISE" as DetectedFormat,
        label: "Análise de Performance",
        category: "ANÁLISE" as AiSkillCategory,
        suggestedProfile: "STRATEGY_ADVANCED",
        fallbackName: "Analista de Conteúdo",
        fallbackDescription: "Extração de aprendizados e análise de métricas de conversão.",
        whenToUse: "Para analisar histórico de publicações e identificar padrões vencedores.",
        targetObjective: "Otimizar decisões com base em dados de engajamento.",
        outputSchema: {
          summary: "string",
          key_findings: ["string"],
          actionable_insights: ["string"]
        },
      };
    }

    // 6. DEFAULT / POST ESTÁTICO / GERAL
    return {
      format: "POST_ESTATICO" as DetectedFormat,
      label: "Post Estático & Copy",
      category: "CONTEÚDO" as AiSkillCategory,
      suggestedProfile: "CONTENT_STANDARD",
      fallbackName: this.capitalizeTitle(titleHint) || "Skill de Conteúdo",
      fallbackDescription: "Skill especializada para geração de publicações e copies.",
      whenToUse: "Para criar publicações assertivas alinhadas à voz da marca.",
      targetObjective: "Engajamento, clareza e autoridade.",
      outputSchema: {
        headline: "string",
        visual_concept: "string",
        caption: "string",
        hashtags: ["string"],
        cta: "string"
      },
    };
  },

  /**
   * Extrai título, frontmatter e seções de um arquivo markdown
   */
  extractFromMarkdownText(content: string, fallbackName: string) {
    let name = "";
    let description = "";
    let whenToUse = "";
    let objective = "";
    let instructions = content;

    // Verificar Frontmatter YAML (--- ... ---)
    const fmMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const titleMatch = fm.match(/(?:title|name):\s*["']?([^"'\n\r]+)["']?/i);
      const descMatch = fm.match(/description:\s*["']?([^"'\n\r]+)["']?/i);
      if (titleMatch) name = titleMatch[1].trim();
      if (descMatch) description = descMatch[1].trim();
    }

    // Se não achou no frontmatter, busca pelo primeiro `# Título`
    if (!name) {
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match) {
        name = h1Match[1].trim();
      }
    }

    if (!name) {
      name = this.capitalizeTitle(fallbackName);
    }

    // Busca seções de Objetivo e Quando Usar se existirem no texto
    const objMatch = content.match(/##\s*(?:Objetivo|Target Objective)[\s\S]*?\n([^#\n\r][^\n\r]+)/i);
    if (objMatch) objective = objMatch[1].trim();

    const whenMatch = content.match(/##\s*(?:Quando Usar|When to use)[\s\S]*?\n([^#\n\r][^\n\r]+)/i);
    if (whenMatch) whenToUse = whenMatch[1].trim();

    // Se não tem frontmatter, formata um manifesto limpo
    let manifestContent = content;
    if (!content.trim().startsWith("---")) {
      manifestContent = `---
name: ${this.generateSlug(name)}
title: ${name}
version: 1.0.0
description: ${description || "Skill global da plataforma Criafy."}
---

${content}`;
    }

    return {
      name,
      description,
      whenToUse,
      objective,
      instructions,
      manifestContent,
    };
  },

  /**
   * Extrai subseções identificáveis de referências se houver
   */
  extractSubSections(content: string): AiSkillFile[] {
    const files: AiSkillFile[] = [];

    // Se tem seção de Hooks/Ganchos
    const hooksSection = content.match(/##\s*(?:Hooks|Ganchos|Fórmulas de Gancho)[\s\S]*?(?=\n##|\Z)/i);
    if (hooksSection) {
      files.push({
        path: "references/hooks.md",
        name: "hooks.md",
        type: "reference",
        content: hooksSection[0].trim(),
        size: hooksSection[0].length,
        updatedAt: new Date().toISOString(),
      });
    }

    // Se tem seção de Templates/Exemplos
    const templateSection = content.match(/##\s*(?:Template|Exemplo|Estrutura Recomendada)[\s\S]*?(?=\n##|\Z)/i);
    if (templateSection) {
      files.push({
        path: "assets/template.md",
        name: "template.md",
        type: "asset",
        content: templateSection[0].trim(),
        size: templateSection[0].length,
        updatedAt: new Date().toISOString(),
      });
    }

    return files;
  },

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  },

  capitalizeTitle(str: string): string {
    return str
      .replace(/[-_]+/g, " ")
      .replace(/\.(md|zip|txt)$/i, "")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  },
};
