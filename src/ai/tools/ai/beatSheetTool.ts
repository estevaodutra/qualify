import {
  GenerateBeatSheetInput,
  GenerateBeatSheetOutput,
  BeatItem,
  GenerateBeatSheetInputSchema,
  GenerateBeatSheetOutputSchema,
  ToolDefinition,
} from "../../schemas";

export function generateReelBeatSheet(
  script: string,
  targetDuration = 30,
  wpm = 165
): GenerateBeatSheetOutput {
  const lines = (script || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  const wordsPerSecond = wpm / 60;
  let currentSecond = 0;
  const beats: BeatItem[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  lines.forEach((line, index) => {
    const words = line.match(/[A-Za-z0-9$%'’.\-áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]+/g) || [];
    const count = words.length;
    const estSec = Math.max(1.2, count / wordsPerSecond);

    const m = Math.floor(currentSecond / 60);
    const s = Math.floor(currentSecond % 60);
    const timecode = `${m}:${s < 10 ? "0" : ""}${s}`;

    let type: BeatItem["type"] = "BODY";
    if (index === 0) type = "HOOK";
    else if (index === lines.length - 1) type = "LOOP";
    else if (index === lines.length - 2) type = "PAYOFF";

    let beatWarning: string | undefined;
    if (type === "HOOK" && estSec > 3.5) {
      beatWarning = "Gancho falado excede 3.5 segundos. Reduza palavras para reter no primeiro frame.";
      warnings.push("O gancho ultrapassa a barreira crítica de 3s de retenção do Instagram.");
    } else if (estSec > 5.0) {
      beatWarning = "Bloco falado contínuo longo (> 5s). Recomendado corte de câmera ou b-roll.";
    }

    beats.push({
      id: index + 1,
      text: line,
      wordCount: count,
      estimatedSeconds: Number(estSec.toFixed(1)),
      timecode,
      type,
      warning: beatWarning,
    });

    currentSecond += estSec;
  });

  const totalWords = beats.reduce((acc, b) => acc + b.wordCount, 0);
  const totalSeconds = Number(currentSecond.toFixed(1));
  const hookValid = beats.length > 0 && beats[0].estimatedSeconds <= 3.5;

  const totalM = Math.floor(totalSeconds / 60);
  const totalS = Math.floor(totalSeconds % 60);
  const formattedDuration = `${totalM > 0 ? `${totalM}m ` : ""}${totalS}s`;

  if (totalSeconds > 60) {
    warnings.push("Roteiro ultrapassa 60 segundos. Reels entre 20s e 45s têm melhores taxas de conclusão no algoritmo.");
  }

  notes.push(`Ritmo calculado a ${wpm} palavras por minuto (ritmo dinâmico de fala para vídeo curto).`);
  if (hookValid) {
    notes.push("Gancho dentro do limite seguro de 3.5 segundos.");
  }
  notes.push(`Total de ${beats.length} blocos com cortes planejados.`);

  return {
    total_seconds: totalSeconds,
    total_words: totalWords,
    formatted_duration: formattedDuration,
    hook_valid: hookValid,
    beats,
    notes,
    warnings,
  };
}

export const beatSheetTool: ToolDefinition<GenerateBeatSheetInput, GenerateBeatSheetOutput> = {
  name: "ai.generate_beat_sheet",
  description:
    "Gera uma folha de tempo de gravação (beat sheet) detalhada por blocos a ~165 palavras por minuto, validando tempo de hook, corpo, clímax e CTA em loop.",
  type: "read_only",
  permission: "ai.use_tools",
  input_schema: GenerateBeatSheetInputSchema,
  output_schema: GenerateBeatSheetOutputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input: GenerateBeatSheetInput) => {
    return generateReelBeatSheet(input.script, input.target_duration, input.wpm);
  },
};
