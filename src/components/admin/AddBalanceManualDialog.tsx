import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreditManual, type AdminCompany } from "@/hooks/useAdmin";

const REASONS = [
  { value: "adjustment", label: "Ajuste de saldo" },
  { value: "bonus", label: "Bonificação" },
  { value: "correction", label: "Correção de erro" },
  { value: "courtesy", label: "Cortesia" },
  { value: "other", label: "Outro" },
];

export function AddBalanceManualDialog({
  company, open, onClose,
}: { company: AdminCompany | null; open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("adjustment");
  const [note, setNote] = useState("");
  const credit = useCreditManual();

  useEffect(() => { if (open) { setAmount(""); setReason("adjustment"); setNote(""); } }, [open]);

  const handleSubmit = async () => {
    if (!company) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    await credit.mutateAsync({
      company_id: company.id, amount: amt, reason,
      description: note || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar saldo manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm">
            Empresa: <span className="font-medium">{company?.name}</span>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={credit.isPending || !amount}>
            {credit.isPending ? "Creditando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
