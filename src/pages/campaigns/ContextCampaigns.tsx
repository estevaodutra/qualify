import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  MessageSquare,
  Activity,
  Clock,
  Hash,
  Settings2,
  Play,
  Trash2,
  ArrowRight,
  Webhook
} from "lucide-react";
import { useContextCampaigns, ContextCampaign } from "@/hooks/useContextCampaigns";
import { useCampaigns } from "@/hooks/useCampaigns"; // For group selection if needed

const ContextCampaigns = () => {
  const { campaigns, isLoading, createCampaign, deleteCampaign, triggerContext, updateCampaign } = useContextCampaigns();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Partial<ContextCampaign>>({
    name: "",
    group_jid: "",
    trigger_type: "keyword",
    trigger_config: {
      keyword: "#novoproduto",
      duration_minutes: 30
    },
    webhook_url: "",
    is_active: true
  });

  const handleCreate = async () => {
    await createCampaign.mutateAsync(newCampaign);
    setIsCreateOpen(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Campanhas de Contexto
          </h1>
          <p className="text-muted-foreground mt-2">
            Capture, compile e envie o contexto de grupos automaticamente para seu Webhook.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
              <Plus className="w-5 h-5 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-background/80 border-primary/10">
            <DialogHeader>
              <DialogTitle>Criar Campanha de Contexto</DialogTitle>
              <DialogDescription>
                Configure como e quando o contexto do grupo deve ser coletado.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label>Nome da Campanha</Label>
                <Input
                  placeholder="Ex: Lançamento de Produto"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>ID do Grupo (JID)</Label>
                <Input
                  placeholder="123456789@g.us"
                  value={newCampaign.group_jid}
                  onChange={(e) => setNewCampaign({ ...newCampaign, group_jid: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Gatilho</Label>
                  <Select
                    value={newCampaign.trigger_type}
                    onValueChange={(v: any) => setNewCampaign({ ...newCampaign, trigger_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Palavra-Chave</SelectItem>
                      <SelectItem value="first_message">Primeira Mensagem</SelectItem>
                      <SelectItem value="scheduled">Diário (Agendado)</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newCampaign.trigger_type === "keyword" && (
                  <div className="space-y-2">
                    <Label>Hashtag/Palavra</Label>
                    <Input
                      placeholder="#suapala"
                      value={newCampaign.trigger_config?.keyword}
                      onChange={(e) => setNewCampaign({
                        ...newCampaign,
                        trigger_config: { ...newCampaign.trigger_config, keyword: e.target.value }
                      })}
                    />
                  </div>
                )}
              </div>

              {(newCampaign.trigger_type === "keyword" || newCampaign.trigger_type === "first_message") && (
                <div className="space-y-2">
                  <Label>Duração da Coleta (Minutos)</Label>
                  <Input 
                    type="number"
                    placeholder="Ex: 30"
                    value={newCampaign.trigger_config?.duration_minutes}
                    onChange={(e) => setNewCampaign({
                      ...newCampaign, 
                      trigger_config: {...newCampaign.trigger_config, duration_minutes: parseInt(e.target.value)}
                    })}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mensagem de Abertura (Opcional)</Label>
                  <Input 
                    placeholder="Ex: Coleta iniciada..." 
                    value={newCampaign.opening_message || ""}
                    onChange={(e) => setNewCampaign({...newCampaign, opening_message: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem de Fechamento (Opcional)</Label>
                  <Input 
                    placeholder="Ex: Coleta finalizada." 
                    value={newCampaign.closing_message || ""}
                    onChange={(e) => setNewCampaign({...newCampaign, closing_message: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="relative">
                  <Webhook className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="https://sua-api.com/webhook"
                    value={newCampaign.webhook_url}
                    onChange={(e) => setNewCampaign({ ...newCampaign, webhook_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createCampaign.isPending}>
                {createCampaign.isPending ? "Criando..." : "Criar Campanha"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="group overflow-hidden border-primary/5 hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300`}>
                    {campaign.trigger_type === "keyword" ? <Hash className="w-5 h-5" /> :
                      campaign.trigger_type === "scheduled" ? <Clock className="w-5 h-5" /> :
                        <MessageSquare className="w-5 h-5" />}
                  </div>
                  <Switch
                    checked={campaign.is_active}
                    onCheckedChange={(v) => updateCampaign.mutate({ id: campaign.id, is_active: v })}
                  />
                </div>
                <CardTitle className="mt-4 text-xl font-semibold leading-tight">{campaign.name}</CardTitle>
                <CardDescription className="font-mono text-xs opacity-70 truncate">
                  {campaign.group_jid}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Activity className="w-4 h-4 mr-2 opacity-50" />
                    <span>
                      {campaign.trigger_type === "keyword" ? `Gatilho: ${campaign.trigger_config.keyword}` :
                        campaign.trigger_type === "scheduled" ? `Diário às ${campaign.trigger_config.daily_time}` :
                          "Acionamento Manual"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2 opacity-50" />
                    <span>Janela de {campaign.trigger_config.duration_minutes || 30} min</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-primary/5 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-full border-primary/10 hover:bg-primary/5"
                    onClick={() => triggerContext.mutate({ campaignId: campaign.id })}
                    disabled={triggerContext.isPending}
                  >
                    <Play className="w-4 h-4 mr-2 text-green-500" />
                    Executar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-destructive hover:bg-destructive/10"
                    onClick={() => deleteCampaign.mutate(campaign.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {campaigns?.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-primary/10 rounded-3xl bg-primary/5">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Settings2 className="w-8 h-8 text-primary/40" />
              </div>
              <h3 className="text-xl font-medium">Nenhuma campanha configurada</h3>
              <p className="text-muted-foreground mt-2">Clique em "Nova Campanha" para começar a monitorar o contexto dos seus grupos.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContextCampaigns;
