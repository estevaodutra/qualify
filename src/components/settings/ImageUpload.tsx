import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  currentUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  type: "profile" | "company";
  name: string;
  className?: string;
}

export function ImageUpload({ currentUrl, onUploadSuccess, type, name, className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("media")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(filePath);

      onUploadSuccess(publicUrl);
      toast({
        title: "Sucesso!",
        description: "Imagem enviada com sucesso.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem. Verifique se o bucket 'media' existe.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn("relative group", className)}>
      <Avatar className={cn(
        "h-24 w-24 border-4 border-background shadow-xl ring-1 ring-border transition-all duration-300 group-hover:ring-primary/50",
        type === "company" ? "rounded-2xl" : "rounded-full"
      )}>
        <AvatarImage src={currentUrl || ""} alt={name} className="object-cover" />
        <AvatarFallback className={cn(
          "text-2xl font-bold bg-muted",
          type === "company" ? "rounded-2xl" : "rounded-full"
        )}>
          {initials || (type === "profile" ? <User /> : <Building2 />)}
        </AvatarFallback>
      </Avatar>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          type === "company" ? "rounded-2xl" : "rounded-full",
          isUploading && "opacity-100 cursor-not-allowed"
        )}
      >
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Camera className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Alterar</span>
          </div>
        )}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
