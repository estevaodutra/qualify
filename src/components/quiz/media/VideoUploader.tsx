// src/components/quiz/media/VideoUploader.tsx
import React, { useState, useRef } from "react";
import { Upload, Loader2, Video as VideoIcon, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";

interface VideoUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ value, onChange, label }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const funnel = useQuizBuilderStore((s) => s.funnel);

  const handleButtonClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({ title: "Formato inválido", description: "Selecione um arquivo de vídeo (MP4, WebM, MOV).", variant: "destructive" });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo para vídeo é 50MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `videos/${funnel?.id || "global"}/${fileName}`;

      const bucketsToTry = ["quiz-media", "group-photos"];
      let uploadSuccess = false;
      let lastErrorMessage = "";

      for (const bucketName of bucketsToTry) {
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
          onChange(data.publicUrl);
          toast({ title: "Vídeo enviado com sucesso!" });
          uploadSuccess = true;
          break;
        } else {
          lastErrorMessage = uploadError.message;
          if (!uploadError.message.toLowerCase().includes("not found")) {
            throw uploadError;
          }
        }
      }

      if (!uploadSuccess) {
        throw new Error(lastErrorMessage || "Não foi possível enviar o vídeo para o storage.");
      }
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-semibold text-foreground/90">{label}</label>}
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative w-16 h-16 rounded-lg border bg-black overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
            <video src={value} className="w-full h-full object-cover opacity-80" />
            <Play className="w-5 h-5 text-white absolute opacity-90" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-muted-foreground shrink-0">
            <VideoIcon className="w-6 h-6 opacity-40" />
          </div>
        )}

        <div className="flex-1 flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleButtonClick}
            disabled={uploading}
            className="h-9 text-xs gap-2 w-full font-medium"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <Upload className="w-3.5 h-3 text-indigo-500" />}
            {uploading ? "Enviando vídeo..." : "Fazer Upload de Vídeo"}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/ogg"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />

          <p className="text-[10px] text-muted-foreground">Formatos: MP4, WebM, MOV (Máx. 50MB)</p>
        </div>
      </div>
    </div>
  );
};
