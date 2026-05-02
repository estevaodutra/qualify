import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Loader2 } from "lucide-react";

interface GroupCreateModalProps {
  instanceId: string;
  onSuccess?: (groupId: string) => void;
  children?: React.ReactNode;
}

export function GroupCreateModal({ instanceId, onSuccess, children }: GroupCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phones, setPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addPhone = () => {
    const cleaned = phoneInput.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast.error("Número inválido. Mínimo 10 dígitos.");
      return;
    }
    if (phones.includes(cleaned)) {
      toast.error("Número já adicionado.");
      return;
    }
    setPhones((prev) => [...prev, cleaned]);
    setPhoneInput("");
  };

  const removePhone = (phone: string) => {
    setPhones((prev) => prev.filter((p) => p !== phone));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          instanceId,
          endpoint: "/create-group",
          method: "POST",
          body: { groupName, phones },
        },
      });
      if (error) throw error;
      toast.success("Grupo criado com sucesso!");
      onSuccess?.(data?.phone || "");
      setOpen(false);
      setGroupName("");
      setPhones([]);
    } catch (err) {
      toast.error("Falha ao criar grupo: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = groupName.trim().length >= 3 && phones.length >= 1 && !loading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button><Plus className="h-4 w-4 mr-2" />Criar Grupo</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Grupo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome do grupo *</label>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nome do grupo" />
          </div>
          <div>
            <label className="text-sm font-medium">Participantes *</label>
            <div className="flex gap-2">
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Número com DDI+DDD..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhone())}
              />
              <Button type="button" size="icon" variant="outline" onClick={addPhone}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {phones.length > 0 && (
              <div className="mt-2 space-y-1 rounded-md border p-2">
                {phones.map((phone) => (
                  <div key={phone} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{phone}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePhone(phone)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Grupo →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
