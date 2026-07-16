// src/components/quiz/media/ImageUploader.tsx
import React, { useState } from "react";
import { Upload, Loader2, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuizBuilderStore } from "@/stores/quiz/useQuizBuilderStore";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, label }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const funnel = useQuizBuilderStore((s) => s.funnel);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem (PNG, JPG, SVG, WebP).", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `branding/${funnel?.id || "global"}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("quiz-media")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("quiz-media").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      onChange(publicUrl);
      toast({ title: "Upload realizado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-semibold">{label}</label>}
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative w-16 h-16 rounded-lg border bg-card overflow-hidden flex items-center justify-center shrink-0">
            <img src={value} alt="Preview" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-muted-foreground shrink-0">
            <ImageIcon className="w-6 h-6 opacity-40" />
          </div>
        )}

        <div className="flex-1 flex flex-col gap-1.5">
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" type="button" className="h-8 text-xs gap-1.5 w-full pointer-events-none" disabled={uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? "Enviando..." : "Subir Logo / Imagem"}
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="text-[10px] text-muted-foreground">Formatos suportados: PNG, JPG, SVG, WebP (Máx. 5MB)</p>
        </div>
      </div>
    </div>
  );
};
