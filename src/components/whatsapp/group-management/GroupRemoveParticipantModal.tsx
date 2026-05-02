import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserMinus } from "lucide-react";

export interface GroupRemoveParticipantModalProps {
  instanceId: string;
  groupId: string;
  participants?: Array<{ phone: string; name?: string }>;
  onSuccess?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupRemoveParticipantModal({ instanceId, groupId, participants, onSuccess, children, open: controlledOpen, onOpenChange }: GroupRemoveParticipantModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v); if (!v) setSelectedPhone(""); };

  const [selectedPhone, setSelectedPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedPhone) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: { instanceId, endpoint: "/remove-participant", method: "POST", body: { phone: groupId, phones: [selectedPhone] } },
      });
      if (error) throw error;
      toast.success("Participante removido!");
      onSuccess?.();
      setOpen(false);
    } catch (err) {
      toast.error("Falha ao remover: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {children || <Button variant="outline" size="sm"><UserMinus className="h-4 w-4 mr-2" />Remover</Button>}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>Remover Participante</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="text-sm font-medium">Participante *</label>
          {participants && participants.length > 0 ? (
            <Select value={selectedPhone} onValueChange={setSelectedPhone}>
              <SelectTrigger><SelectValue placeholder="Selecione o participante..." /></SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.phone} value={p.phone}>{p.name ? `${p.name} - ${p.phone}` : p.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={selectedPhone} onChange={(e) => setSelectedPhone(e.target.value)} placeholder="Número com DDI+DDD..." />
          )}
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <span className="text-sm text-destructive">⚠ Esta ação remove o contato do grupo imediatamente.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!selectedPhone || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Remover →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
