/**
 * reelBeats.ts
 * Transforma o roteiro de um Reel em uma folha de tempo (beat sheet)
 * estimando o tempo de gravação a ~165 palavras por minuto.
 */

export interface BeatItem {
  id: number;
  text: string;
  wordCount: number;
  estimatedSeconds: number;
  timecode: string;
  type: "HOOK" | "BODY" | "PAYOFF" | "LOOP";
  warning?: string;
}

export interface ReelBeatsResult {
  totalWords: number;
  totalSeconds: number;
  formattedDuration: string;
  beats: BeatItem[];
  hookValid: boolean;
  warnings: string[];
}

export function analyzeReelBeats(script: string, wpm = 165): ReelBeatsResult {
  const lines = (script || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  const wordsPerSecond = wpm / 60;
  let currentSecond = 0;
  const beats: BeatItem[] = [];
  const warnings: string[] = [];

  lines.forEach((line, index) => {
    const words = line.match(/[A-Za-z0-9$%'’\-áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]+/g) || [];
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
      beatWarning = "Gancho muito longo (> 3s). Reduza palavras para reter no primeiro frame.";
      warnings.push("O gancho falado excede 3 segundos. Espectadores decidem continuar em até 2.5s.");
    } else if (estSec > 5.0) {
      beatWarning = "Trecho estático longo (> 5s). Troque o enquadramento ou adicione corte.";
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
  const hookValid = beats.length > 0 && (beats[0].estimatedSeconds <= 3.5);

  const totalM = Math.floor(totalSeconds / 60);
  const totalS = Math.floor(totalSeconds % 60);
  const formattedDuration = `${totalM > 0 ? `${totalM}m ` : ""}${totalS}s`;

  if (totalSeconds > 60) {
    warnings.push("O roteiro ultrapassa 60 segundos. Reels entre 18s e 45s têm as melhores taxas de conclusão.");
  }

  return {
    totalWords,
    totalSeconds,
    formattedDuration,
    beats,
    hookValid,
    warnings,
  };
}
