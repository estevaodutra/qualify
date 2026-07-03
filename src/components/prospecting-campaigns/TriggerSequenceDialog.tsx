import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useDispatchSequences } from "@/hooks/useDispatchSequences";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TriggerSequenceDialogProps {
  leadPhone: string;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TriggerSequenceDialog({ leadPhone, leadName, open, onOpenChange }: TriggerSequenceDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { campaigns, isLoading: loadingCampaigns } = useDispatchCampaigns();
  const { sequences, isLoading: loadingSequences } = useDispatchSequences(selectedCampaignId || undefined);

  const activeCampaigns = campaigns.filter(c => c.status === "active");

  const handleSubmit = async () => {
    if (!selectedCampaignId || !selectedSequenceId) return;

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.functions.invoke("execute-dispatch-sequence", {
        body: {
          campaignId: selectedCampaignId,
          sequenceId: selectedSequenceId,
          triggerContext: {
            respondentPhone: leadPhone,
            respondentName: leadName,
            respondentJid: leadPhone.replace(/[^0-9]/g, '') + "@s.whatsapp.net",
            groupJid: "",
            sendPrivate: false
          }
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Sequência engatilhada com sucesso para " + leadName);
      onOpenChange(false);
      setSelectedCampaignId("");
      setSelectedSequenceId("");
    } catch (err: any) {
      console.error("Error triggering sequence:", err);
      toast.error(err.message || "Erro ao engatilhar sequência");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Disparar Sequência</DialogTitle>
          <DialogDescription>
            Envie uma sequência de mensagens do WhatsApp para <strong>{leadName}</strong> ({leadPhone}).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Campanha de Despacho</Label>
            <Select value={selectedCampaignId} onValueChange={(val) => { setSelectedCampaignId(val); setSelectedSequenceId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCampaigns ? "Carregando..." : "Selecione a campanha"} />
              </SelectTrigger>
              <SelectContent>
                {activeCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                {activeCampaigns.length === 0 && (
                  <SelectItem value="none" disabled>Nenhuma campanha ativa</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedCampaignId && (
            <div className="space-y-2">
              <Label>Sequência</Label>
              <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingSequences ? "Carregando..." : "Selecione a sequência"} />
                </SelectTrigger>
                <SelectContent>
                  {sequences.filter(s => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                  {sequences.filter(s => s.isActive).length === 0 && (
                    <SelectItem value="none" disabled>Nenhuma sequência ativa</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedCampaignId || !selectedSequenceId || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Disparar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
