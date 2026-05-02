import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";

interface UploadResult {
  url: string;
  path: string;
  filename: string;
}

type MediaType = "image" | "video" | "audio" | "document" | "sticker";

const TYPE_LIMITS: Record<MediaType, { maxMB: number; types: string[]; label: string }> = {
  image: { 
    maxMB: 5, 
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    label: "JPEG, PNG, WebP, GIF"
  },
  video: { 
    maxMB: 16, 
    types: ["video/mp4", "video/3gpp", "video/quicktime"],
    label: "MP4, 3GP, MOV"
  },
  audio: { 
    maxMB: 16, 
    types: ["audio/ogg", "audio/mpeg", "audio/mp3", "audio/aac", "audio/wav"],
    label: "OGG, MP3, AAC, WAV"
  },
  document: { 
    maxMB: 100, 
    types: [
      "application/pdf", 
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],
    label: "PDF, DOC, XLS, PPT"
  },
  sticker: { 
    maxMB: 0.1, 
    types: ["image/webp"],
    label: "WebP (100KB)"
  },
};

export function useMediaUpload(mediaType: MediaType) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToLibrary } = useMediaLibrary();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const limits = TYPE_LIMITS[mediaType];

  const upload = async (file: File): Promise<UploadResult | null> => {
    if (!user) {
      toast({ 
        title: "Erro", 
        description: "Faça login para fazer upload", 
        variant: "destructive" 
      });
      return null;
    }

    // Validar tamanho
    const maxBytes = limits.maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({ 
        title: "Arquivo muito grande", 
        description: `Máximo permitido: ${limits.maxMB >= 1 ? `${limits.maxMB}MB` : `${limits.maxMB * 1000}KB`}`, 
        variant: "destructive" 
      });
      return null;
    }

    // Validar tipo
    if (!limits.types.includes(file.type)) {
      toast({ 
        title: "Tipo não suportado", 
        description: `Tipos aceitos: ${limits.label}`, 
        variant: "destructive" 
      });
      return null;
    }

    setIsUploading(true);
    setProgress(10);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${mediaType}/${fileName}`;

      setProgress(30);

      const { error } = await supabase.storage
        .from("sequence-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setProgress(80);

      const { data: { publicUrl } } = supabase.storage
        .from("sequence-media")
        .getPublicUrl(filePath);

      setProgress(100);

      // Registrar na biblioteca de mídia
      try {
        await addToLibrary({
          filename: file.name,
          storagePath: filePath,
          publicUrl,
          mediaType,
          mimeType: file.type,
          fileSize: file.size,
        });
      } catch (libError) {
        console.error("Erro ao registrar na biblioteca:", libError);
      }

      toast({ title: "Upload concluído", description: file.name });

      return {
        url: publicUrl,
        path: filePath,
        filename: file.name,
      };
    } catch (error) {
      toast({ 
        title: "Erro no upload", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const deleteFile = async (path: string) => {
    try {
      const { error } = await supabase.storage
        .from("sequence-media")
        .remove([path]);
      if (error) throw error;
      toast({ title: "Arquivo removido" });
    } catch (error) {
      toast({ 
        title: "Erro ao remover", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
    }
  };

  return {
    upload,
    deleteFile,
    isUploading,
    progress,
    acceptedTypes: limits.types.join(","),
    maxSizeMB: limits.maxMB,
    typesLabel: limits.label,
  };
}
