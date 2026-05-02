import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

export interface GroupUpdateNameModalProps {
  instanceId: string;
  groupId: string;
  currentName?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupUpdateNameModal({ instanceId, groupId, currentName, onSuccess, children, open: controlledOpen, onOpenChange }: GroupUpdateNameModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v); };

  const [name, setName] = useState(currentName || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setName(currentName || "");
  }, [open, currentName]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: { instanceId, endpoint: "/update-group-name", method: "POST", body: { phone: groupId, groupName: name } },
      });
      if (error) throw error;
      toast.success("Nome do grupo atualizado!");
      onSuccess?.();
      setOpen(false);
    } catch (err) {
      toast.error("Falha ao atualizar nome: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {children || <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-2" />Renomear</Button>}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>Atualizar Nome do Grupo</DialogTitle></DialogHeader>
        <div>
          <label className="text-sm font-medium">Novo nome *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do grupo" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={name.trim().length < 3 || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Nome →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
