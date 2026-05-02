import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Loader2, UserPlus } from "lucide-react";

export interface GroupAddParticipantModalProps {
  instanceId: string;
  groupId: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupAddParticipantModal({ instanceId, groupId, onSuccess, children, open: controlledOpen, onOpenChange }: GroupAddParticipantModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v); if (!v) setPhones([]); };

  const [phoneInput, setPhoneInput] = useState("");
  const [phones, setPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addPhone = () => {
    const cleaned = phoneInput.replace(/\D/g, "");
    if (cleaned.length < 10) { toast.error("Número inválido. Mínimo 10 dígitos."); return; }
    if (phones.includes(cleaned)) { toast.error("Número já adicionado."); return; }
    setPhones((prev) => [...prev, cleaned]);
    setPhoneInput("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: { instanceId, endpoint: "/add-participant", method: "POST", body: { phone: groupId, phones } },
      });
      if (error) throw error;
      toast.success("Participantes adicionados!");
      onSuccess?.();
      setOpen(false);
    } catch (err) {
      toast.error("Falha ao adicionar: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {children || <Button variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-2" />Adicionar</Button>}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar Participantes</DialogTitle></DialogHeader>
        <div>
          <label className="text-sm font-medium">Número (DDI + DDD + número) *</label>
          <div className="flex gap-2">
            <Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="Número..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhone())} />
            <Button type="button" size="icon" variant="outline" onClick={addPhone}><Plus className="h-4 w-4" /></Button>
          </div>
          {phones.length > 0 && (
            <div className="mt-2 space-y-1 rounded-md border p-2">
              {phones.map((phone) => (
                <div key={phone} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{phone}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPhones((p) => p.filter((x) => x !== phone))}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">ex: 5511999999999</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={phones.length === 0 || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adicionar →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
