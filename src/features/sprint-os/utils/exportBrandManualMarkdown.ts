import { BrandManualData } from "../domain/types";
import { toast } from "sonner";

/**
 * Gera o texto Markdown estruturado e formatado do Manual da Marca preenchido.
 */
export function generateBrandManualMarkdown(
  workspaceName: string,
  brandManual: BrandManualData,
  userName?: string
): string {
  const lines: string[] = [];

  const allActiveFields = (brandManual.fields || []).filter(
    (f) => !f.archived && !f.removed
  );
  const completedFields = allActiveFields.filter(
    (f) => (f.response || "").trim().length > 15
  );
  const progressPercent =
    allActiveFields.length > 0
      ? Math.round((completedFields.length / allActiveFields.length) * 100)
      : 0;

  lines.push(`# MANUAL DE MARCA 7D — ${workspaceName.toUpperCase()}`);
  lines.push(`> **Projeto:** ${workspaceName}`);
  lines.push(
    `> **Data de Exportação:** ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`
  );
  lines.push(`> **Exportado por:** ${userName || "Estrategista"}`);
  lines.push(
    `> **Status de Preenchimento:** ${completedFields.length} de ${allActiveFields.length} perguntas respondidas (${progressPercent}%)`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Sumário Executivo
  lines.push("## SUMÁRIO EXECUTIVO");
  lines.push(
    `Este documento consolida a arquitetura completa da marca **${workspaceName}**, contendo posicionamento estratégico, extração da alma da copy, raio-x do ICP (Avatar), diretrizes de personalidade verbal e variantes de anúncios homologadas.`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Módulos e Perguntas
  const modules = brandManual.modules || [];
  modules.forEach((mod) => {
    const modFields = allActiveFields
      .filter((f) => f.moduleId === mod.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const modCompleted = modFields.filter(
      (f) => (f.response || "").trim().length > 15
    ).length;

    lines.push(`## ${mod.title}`);
    if (mod.description) {
      lines.push(`*${mod.description}*`);
      lines.push("");
    }
    lines.push(
      `**Conclusão do Módulo:** ${modCompleted}/${modFields.length} perguntas respondidas`
    );
    lines.push("");

    // Se houver análise de IA gerada
    if (mod.generatedAnalysis) {
      lines.push(`### 🧠 Análise Estratégica Consolidada (${mod.title})`);
      if (typeof mod.generatedAnalysis === "string") {
        lines.push(mod.generatedAnalysis);
      } else if (typeof mod.generatedAnalysis === "object") {
        Object.entries(mod.generatedAnalysis).forEach(([key, val]) => {
          if (typeof val === "string" || typeof val === "number") {
            lines.push(`- **${key}:** ${val}`);
          } else if (Array.isArray(val)) {
            lines.push(`- **${key}:**`);
            val.forEach((item) =>
              lines.push(`  - ${typeof item === "object" ? JSON.stringify(item) : item}`)
            );
          }
        });
      }
      lines.push("");
    }

    if (modFields.length === 0) {
      lines.push("_Nenhuma pergunta cadastrada neste módulo._");
      lines.push("");
    } else {
      modFields.forEach((field, fIdx) => {
        const responseText = (field.response || "").trim();
        lines.push(`### ${fIdx + 1}. ${field.title}`);
        if (field.context) {
          lines.push(`> **Orientação:** ${field.context}`);
        }
        if (field.strategicMapping && field.strategicMapping.length > 0) {
          lines.push(
            `> **Tags Estratégicas:** \`${field.strategicMapping.join("`, `")}\``
          );
        }
        lines.push("");

        if (responseText) {
          lines.push(responseText);
        } else {
          lines.push("_Não respondido._");
        }

        if (field.transcription && field.audioUrl) {
          lines.push("");
          lines.push(`*(Resposta gravada via áudio)*`);
        }

        lines.push("");
      });
    }

    lines.push("---");
    lines.push("");
  });

  // Copy Ads
  if (brandManual.copyAds && brandManual.copyAds.length > 0) {
    lines.push("## COPY ADS — VARIANTES DE ANÚNCIOS");
    lines.push(
      `Total de variantes cadastradas: **${brandManual.copyAds.length}**`
    );
    lines.push("");

    brandManual.copyAds.forEach((c) => {
      lines.push(
        `### Variante ${c.variantNumber} • Ângulo: ${c.angle} [${c.status.toUpperCase()}]`
      );
      lines.push(`**Headline:**`);
      lines.push(`> ${c.headline}`);
      lines.push("");
      lines.push(`**Subheadline / Corpo:**`);
      lines.push(c.subheadline);
      lines.push("");
    });

    lines.push("---");
    lines.push("");
  }

  // Master Prompt Consolidado
  if (brandManual.masterPrompt) {
    lines.push("## MASTER PROMPT CONSOLIDADO");
    lines.push("```markdown");
    lines.push(brandManual.masterPrompt);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Dispara o download automático do arquivo .md no navegador.
 */
export function downloadBrandManualMarkdown(
  workspaceName: string,
  brandManual: BrandManualData,
  userName?: string
) {
  try {
    const mdContent = generateBrandManualMarkdown(
      workspaceName,
      brandManual,
      userName
    );
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const safeName = (workspaceName || "manual-da-marca")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const dateStr = new Date().toISOString().split("T")[0];
    link.download = `manual-da-marca-${safeName}-${dateStr}.md`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Manual da Marca (.md) exportado com sucesso!");
  } catch (err: any) {
    console.error("Erro ao exportar Manual da Marca em .md:", err);
    toast.error(
      `Falha ao exportar arquivo .md: ${err.message || "Erro desconhecido"}`
    );
  }
}
