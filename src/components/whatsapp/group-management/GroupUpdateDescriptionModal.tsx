import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";

export interface GroupUpdateDescriptionModalProps {
  instanceId: string;
  groupId: string;
  currentDescription?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupUpdateDescriptionModal({ instanceId, groupId, currentDescription, onSuccess, children, open: controlledOpen, onOpenChange }: GroupUpdateDescriptionModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v); };

  const [description, setDescription] = useState(currentDescription || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setDescription(currentDescription || "");
  }, [open, currentDescription]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: { instanceId, endpoint: "/update-group-description", method: "POST", body: { phone: groupId, description } },
      });
      if (error) throw error;
      toast.success("Descrição atualizada!");
      onSuccess?.();
      setOpen(false);
    } catch (err) {
      toast.error("Falha ao atualizar descrição: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {children || <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-2" />Descrição</Button>}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>Atualizar Descrição</DialogTitle></DialogHeader>
        <div>
          <label className="text-sm font-medium">Descrição</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} placeholder="Descrição do grupo..." rows={4} />
          <p className="text-xs text-muted-foreground mt-1">{description.length} / 500 caracteres</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Descrição →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
