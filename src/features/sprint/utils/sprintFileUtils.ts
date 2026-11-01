import { supabase } from "@/integrations/supabase/client";

export function formatBytes(bytes?: number | null, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export async function downloadSprintFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Falha ao obter arquivo");
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "arquivo";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch {
    // Fallback: abrir em nova aba
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export interface UploadSprintFileResult {
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export async function uploadSprintFile(
  file: File,
  userId: string,
  boardId: string
): Promise<UploadSprintFileResult> {
  const fileExt = file.name.split(".").pop() || "bin";
  const cleanName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
    .slice(0, 50);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const storedFileName = `${Date.now()}_${cleanName}_${randomSuffix}.${fileExt}`;

  // 1. Tentar bucket dedicado 'sprint-files'
  const sprintPath = `${boardId}/${userId}/${storedFileName}`;
  try {
    const { error } = await (supabase as any).storage
      .from("sprint-files")
      .upload(sprintPath, file, { cacheControl: "3600", upsert: false });

    if (!error) {
      const {
        data: { publicUrl },
      } = (supabase as any).storage.from("sprint-files").getPublicUrl(sprintPath);
      return {
        url: publicUrl,
        storagePath: `sprint-files:${sprintPath}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
      };
    }
  } catch {
    // Continua para o fallback
  }

  // 2. Fallback: 'sequence-media' (usa auth.uid() no prefixo de pasta)
  const seqPath = `${userId}/sprint/${boardId}/${storedFileName}`;
  try {
    const { error: seqError } = await (supabase as any).storage
      .from("sequence-media")
      .upload(seqPath, file, { cacheControl: "3600", upsert: false });

    if (!seqError) {
      const {
        data: { publicUrl },
      } = (supabase as any).storage.from("sequence-media").getPublicUrl(seqPath);
      return {
        url: publicUrl,
        storagePath: `sequence-media:${seqPath}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
      };
    }
  } catch {
    // Continua para o segundo fallback
  }

  // 3. Fallback: 'scheduling-assets'
  const schedPath = `${userId}/${storedFileName}`;
  const { error: schedError } = await (supabase as any).storage
    .from("scheduling-assets")
    .upload(schedPath, file, { cacheControl: "3600", upsert: false });

  if (schedError) {
    throw new Error(`Erro ao enviar arquivo para o armazenamento: ${schedError.message}`);
  }

  const {
    data: { publicUrl },
  } = (supabase as any).storage.from("scheduling-assets").getPublicUrl(schedPath);

  return {
    url: publicUrl,
    storagePath: `scheduling-assets:${schedPath}`,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || "application/octet-stream",
  };
}
