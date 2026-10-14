export interface MediaValidationResult {
  width: number;
  height: number;
  aspectRatio: string; // e.g. "9:16", "1:1", "4:5", "16:9"
  durationSeconds?: number;
  fileSizeBytes: number;
  isValid: boolean;
  errors: string[];
  supportedPlacements: ("FEED" | "REEL" | "STORY_IMAGE" | "STORY_VIDEO")[];
}

/**
 * Extrai metadados reais de arquivos de imagem ou vídeo no navegador
 */
export async function extractAndValidateMedia(file: File): Promise<MediaValidationResult> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  const fileSizeBytes = file.size;

  if (isVideo) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        const width = video.videoWidth;
        const height = video.videoHeight;
        const durationSeconds = Math.round(video.duration * 100) / 100;

        const ratioValue = width / height;
        const aspectRatio = determineRatioLabel(ratioValue);

        const errors: string[] = [];
        const supportedPlacements: ("FEED" | "REEL" | "STORY_VIDEO")[] = [];

        // Tamanho máximo Meta (geralmente até 100MB para graph API direta)
        if (fileSizeBytes > 100 * 1024 * 1024) {
          errors.push("Arquivo de vídeo excede o limite recomendado de 100MB da Meta Graph API.");
        }

        // Reels validation: ideal 9:16 (0.5625), duração máx 90s
        if (ratioValue >= 0.50 && ratioValue <= 0.65 && durationSeconds <= 90) {
          supportedPlacements.push("REEL");
        }

        // Story vídeo: ideal 9:16, duração máx 60s
        if (ratioValue >= 0.50 && ratioValue <= 0.65 && durationSeconds <= 60) {
          supportedPlacements.push("STORY_VIDEO");
        }

        // Feed vídeo: proporção entre 4:5 e 16:9, duração até 120s
        if (ratioValue >= 0.75 && ratioValue <= 1.8) {
          supportedPlacements.push("FEED");
        }

        if (supportedPlacements.length === 0) {
          errors.push(
            `Proporção (${aspectRatio}) ou duração (${durationSeconds}s) fora dos padrões recomendados do Instagram (Reel/Story: 9:16 até 90s; Feed: 4:5 ou 1:1).`
          );
        }

        resolve({
          width,
          height,
          aspectRatio,
          durationSeconds,
          fileSizeBytes,
          isValid: errors.length === 0,
          errors,
          supportedPlacements,
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          width: 0,
          height: 0,
          aspectRatio: "UNKNOWN",
          fileSizeBytes,
          isValid: false,
          errors: ["Não foi possível ler o arquivo de vídeo. Verifique se o codec é suportado (H.264/MP4)."],
          supportedPlacements: [],
        });
      };
    });
  }

  if (isImage) {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const ratioValue = width / height;
        const aspectRatio = determineRatioLabel(ratioValue);

        const errors: string[] = [];
        const supportedPlacements: ("FEED" | "STORY_IMAGE")[] = [];

        if (fileSizeBytes > 8 * 1024 * 1024) {
          errors.push("Imagem excede o limite máximo de 8MB da Meta API.");
        }

        // Story de imagem: 9:16
        if (ratioValue >= 0.50 && ratioValue <= 0.65) {
          supportedPlacements.push("STORY_IMAGE");
        }

        // Feed de imagem: 1:1 (quadrado), 4:5 (vertical) ou 1.91:1 (horizontal)
        if (ratioValue >= 0.75 && ratioValue <= 1.95) {
          supportedPlacements.push("FEED");
        }

        if (supportedPlacements.length === 0) {
          errors.push(`Proporção da imagem (${aspectRatio}) não é ideal para Feed (1:1 / 4:5) nem Stories (9:16).`);
        }

        resolve({
          width,
          height,
          aspectRatio,
          fileSizeBytes,
          isValid: errors.length === 0,
          errors,
          supportedPlacements,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          width: 0,
          height: 0,
          aspectRatio: "UNKNOWN",
          fileSizeBytes,
          isValid: false,
          errors: ["Não foi possível processar a imagem. Formatos aceitos: JPEG, PNG."],
          supportedPlacements: [],
        });
      };
    });
  }

  return {
    width: 0,
    height: 0,
    aspectRatio: "UNKNOWN",
    fileSizeBytes,
    isValid: false,
    errors: ["Formato de arquivo não suportado. Envie imagens (JPG/PNG) ou vídeos (MP4)."],
    supportedPlacements: [],
  };
}

function determineRatioLabel(ratio: number): string {
  if (Math.abs(ratio - 9 / 16) < 0.08) return "9:16 (Vertical/Reels/Stories)";
  if (Math.abs(ratio - 4 / 5) < 0.08) return "4:5 (Retrato Feed)";
  if (Math.abs(ratio - 1) < 0.08) return "1:1 (Quadrado Feed)";
  if (Math.abs(ratio - 16 / 9) < 0.08) return "16:9 (Paisagem)";
  return `${Math.round(ratio * 100) / 100}:1`;
}
