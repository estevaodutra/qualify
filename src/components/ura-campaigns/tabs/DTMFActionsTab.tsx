import { useState, useMemo } from "react";
import { URACampaign } from "@/hooks/useURACampaigns";
import { useGroupCampaigns } from "@/hooks/useGroupCampaigns";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useSequences } from "@/hooks/useSequences";
import { useDispatchSequences } from "@/hooks/useDispatchSequences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Plus, Trash2, Edit, AlertCircle, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DTMFActionsTabProps {
  campaign: URACampaign;
  onUpdate: (params: { id: string; updates: Partial<URACampaign> }) => Promise<URACampaign>;
}

const dtmfKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#"];

export function DTMFActionsTab({ campaign, onUpdate }: DTMFActionsTabProps) {
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Queries for campaign triggers
  const { campaigns: groupCampaigns = [] } = useGroupCampaigns();
  const { campaigns: dispatchCampaigns = [] } = useDispatchCampaigns();

  // Dialog Form State
  const [actionType, setActionType] = useState<"start_sequence" | "add_tag" | "webhook" | "none">("none");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedCampaignType, setSelectedCampaignType] = useState<"group" | "dispatch" | "">("");
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  // Load sequences dynamically
  const { sequences: groupSequences = [] } = useSequences(
    selectedCampaignType === "group" ? selectedCampaignId : undefined
  );
  const { sequences: dispatchSequences = [] } = useDispatchSequences(
    selectedCampaignType === "dispatch" ? selectedCampaignId : undefined
  );

  const campaignSequences = useMemo(() => {
    return selectedCampaignType === "dispatch" ? dispatchSequences : groupSequences;
  }, [selectedCampaignType, dispatchSequences, groupSequences]);

  const handleOpenConfig = (key: string) => {
    setSelectedKey(key);
    const existing = campaign.dtmfActions?.[key];
    if (existing) {
      setActionType(existing.action_type || "none");
      if (existing.action_type === "start_sequence") {
        setSelectedCampaignId(existing.action_config?.campaignId || "");
        setSelectedCampaignType(existing.action_config?.campaignType || "");
        setSelectedSequenceId(existing.action_config?.sequenceId || "");
      } else if (existing.action_type === "add_tag") {
        setTagValue(existing.action_config?.tag || "");
      } else if (existing.action_type === "webhook") {
        setWebhookUrl(existing.action_config?.url || "");
      }
    } else {
      setActionType("none");
      setSelectedCampaignId("");
      setSelectedCampaignType("");
      setSelectedSequenceId("");
      setTagValue("");
      setWebhookUrl("");
    }
    setShowDialog(true);
  };

  const handleSaveAction = async () => {
    if (!selectedKey) return;
    setLoading(true);

    const updatedActions = { ...campaign.dtmfActions };

    if (actionType === "none") {
      delete updatedActions[selectedKey];
    } else {
      let config: Record<string, any> = {};
      if (actionType === "start_sequence") {
        config = {
          campaignId: selectedCampaignId,
          campaignType: selectedCampaignType,
          sequenceId: selectedSequenceId,
        };
      } else if (actionType === "add_tag") {
        config = { tag: tagValue };
      } else if (actionType === "webhook") {
        config = { url: webhookUrl };
      }

      updatedActions[selectedKey] = {
        action_type: actionType,
        action_config: config,
      };
    }

    try {
      await onUpdate({
        id: campaign.id,
        updates: { dtmfActions: updatedActions },
      });
      setShowDialog(false);
      toast({
        title: "Ação de DTMF atualizada",
        description: `Tecla ${selectedKey} configurada com sucesso.`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAction = async (key: string) => {
    const updatedActions = { ...campaign.dtmfActions };
    delete updatedActions[key];

    try {
      await onUpdate({
        id: campaign.id,
        updates: { dtmfActions: updatedActions },
      });
      toast({
        title: "Ação de DTMF removida",
        description: `Mapeamento da Tecla ${key} foi removido.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getActionLabel = (key: string) => {
    const act = campaign.dtmfActions?.[key];
    if (!act) return "Nenhuma ação";

    switch (act.action_type) {
      case "start_sequence": {
        const type = act.action_config?.campaignType === "dispatch" ? "Disparo" : "Grupo";
        return `Iniciar Sequência (${type})`;
      }
      case "add_tag":
        return `Adicionar Tag: ${act.action_config?.tag}`;
      case "webhook":
        return `Webhook: ${act.action_config?.url}`;
      default:
        return "Desconhecida";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Configuração de Teclas (DTMF)
          </CardTitle>
          <CardDescription>
            Defina o que o Qualify deve fazer quando o cliente digitar uma tecla no telefone durante a ligação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dtmfKeys.map((key) => {
              const hasAction = !!campaign.dtmfActions?.[key];
              return (
                <div
                  key={key}
                  className={`p-4 rounded-xl border transition-all flex justify-between items-center ${
                    hasAction
                      ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                      : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-foreground/10 text-foreground flex items-center justify-center font-bold text-sm">
                        {key}
                      </span>
                      <span className="font-semibold text-sm">Tecla {key}</span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                      {getActionLabel(key)}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenConfig(key)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    {hasAction && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveAction(key)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Configure DTMF Action Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mapear Tecla {selectedKey}</DialogTitle>
            <DialogDescription>
              Escolha qual ação automática executar quando o cliente pressionar a tecla {selectedKey}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo de Ação</Label>
              <Select
                value={actionType}
                onValueChange={(v: any) => {
                  setActionType(v);
                  setSelectedCampaignId("");
                  setSelectedCampaignType("");
                  setSelectedSequenceId("");
                  setTagValue("");
                  setWebhookUrl("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma Ação</SelectItem>
                  <SelectItem value="start_sequence">Iniciar Sequência de Mensagens</SelectItem>
                  <SelectItem value="add_tag">Adicionar Tag ao Lead</SelectItem>
                  <SelectItem value="webhook">Disparar Webhook (POST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === "start_sequence" && (
              <>
                <div className="grid gap-2">
                  <Label>Campanha (WhatsApp)</Label>
                  <Select
                    value={selectedCampaignId}
                    onValueChange={(v) => {
                      const isGroup = groupCampaigns.some((c) => c.id === v);
                      setSelectedCampaignId(v);
                      setSelectedCampaignType(isGroup ? "group" : "dispatch");
                      setSelectedSequenceId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a campanha..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groupCampaigns.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Campanhas de Grupo</SelectLabel>
                          {groupCampaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {dispatchCampaigns.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Campanhas de Disparos</SelectLabel>
                          {dispatchCampaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCampaignId && (
                  <div className="grid gap-2">
                    <Label>Sequência</Label>
                    <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a sequência..." />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignSequences.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {actionType === "add_tag" && (
              <div className="grid gap-2">
                <Label htmlFor="tag-input">Tag</Label>
                <Input
                  id="tag-input"
                  placeholder="Ex: interessado, opt-out"
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                />
              </div>
            )}

            {actionType === "webhook" && (
              <div className="grid gap-2">
                <Label htmlFor="url-input">URL de Destino</Label>
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://suaapi.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAction} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
