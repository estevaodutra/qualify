import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Users } from "lucide-react";

export interface CampaignItem {
  id: string;
  name: string;
  type: string;
  status?: string;
}

interface AddToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  campaigns: CampaignItem[];
  onSubmit: (campaignId: string, campaignType: string, skipExisting: boolean) => void;
  isLoading?: boolean;
}

export function AddToCampaignDialog({ open, onOpenChange, selectedCount, campaigns, onSubmit, isLoading }: AddToCampaignDialogProps) {
  const [campaignType, setCampaignType] = useState<string>("ligacao");
  const [campaignId, setCampaignId] = useState<string>("");
  const [skipExisting, setSkipExisting] = useState(true);

  const filteredCampaigns = campaigns.filter(c => c.type === campaignType);

  const handleSubmit = () => {
    if (!campaignId) return;
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    onSubmit(campaignId, campaign.type, skipExisting);
    setCampaignId("");
    setCampaignType("ligacao");
  };

  const typeConfig = {
    ligacao: { icon: Phone, label: "Campanha de Ligação", color: "text-emerald-500" },
    despacho: { icon: MessageSquare, label: "Campanha de Despacho (WhatsApp)", color: "text-sky-500" },
    grupos: { icon: Users, label: "Campanha de Grupo", color: "text-blue-500" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Leads à Campanha</DialogTitle>
          <DialogDescription>
            {selectedCount} lead{selectedCount !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""} será(ão) adicionado(s) à campanha escolhida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Tipo de Campanha</Label>
            <RadioGroup value={campaignType} onValueChange={(v) => { setCampaignType(v); setCampaignId(""); }} className="mt-2 space-y-2">
              {Object.entries(typeConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={key} id={`type-${key}`} />
                  <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                  <label htmlFor={`type-${key}`} className="text-sm cursor-pointer flex-1">{cfg.label}</label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium">Selecionar Campanha</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione uma campanha..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCampaigns.length === 0 ? (
                  <SelectItem value="__none" disabled>Nenhuma campanha encontrada</SelectItem>
                ) : (
                  filteredCampaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.status && (
                          <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Checkbox checked={skipExisting} onCheckedChange={(c) => setSkipExisting(!!c)} id="skip" />
              <label htmlFor="skip" className="text-sm">Ignorar leads que já estão nesta campanha</label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!campaignId || isLoading}>
            {isLoading ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
