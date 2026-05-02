import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";

export interface GroupUpdatePhotoModalProps {
  instanceId: string;
  groupId: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupUpdatePhotoModal({ instanceId, groupId, onSuccess, children, open: controlledOpen, onOpenChange }: GroupUpdatePhotoModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v); if (!v) { setFile(null); setPreview(null); } };

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 2MB."); return; }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("group-photos").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("group-photos").getPublicUrl(path);
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: { instanceId, endpoint: "/update-group-photo", method: "POST", body: { phone: groupId, photo: urlData.publicUrl } },
      });
      if (error) throw error;
      toast.success("Foto do grupo atualizada!");
      onSuccess?.();
      setOpen(false);
    } catch (err) {
      toast.error("Falha ao atualizar foto: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {children || <Button variant="outline" size="sm"><Camera className="h-4 w-4 mr-2" />Alterar Foto</Button>}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>Atualizar Imagem do Grupo</DialogTitle></DialogHeader>
        <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => inputRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="Preview" className="mx-auto max-h-48 rounded-md object-cover" />
          ) : (
            <div className="space-y-2">
              <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Clique ou arraste aqui</p>
              <p className="text-xs text-muted-foreground">JPG, PNG — máx. 2MB</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!file || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Atualizar Foto →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
