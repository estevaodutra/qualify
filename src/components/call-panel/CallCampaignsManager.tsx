import { useState, useMemo } from "react";
import { PhoneCall, Plus, ArrowLeft, Info, Sparkles, CheckCircle2, Megaphone } from "lucide-react";
import { useCallCampaigns, CallCampaign } from "@/hooks/useCallCampaigns";
import { CallCampaignList, CallCampaignDetails, CreateCampaignDialog } from "@/components/call-campaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface CallCampaignsManagerProps {
  initialCampaignId?: string | null;
  onCampaignSelected?: (campaignId: string | null) => void;
}

export function CallCampaignsManager({
  initialCampaignId,
  onCampaignSelected,
}: CallCampaignsManagerProps) {
  const {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    duplicateCampaign,
    isCreating,
    isDuplicating,
  } = useCallCampaigns();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(initialCampaignId || null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const selectedCampaign = useMemo(() => {
    if (!selectedCampaignId) return null;
    return campaigns.find((c) => c.id === selectedCampaignId) || null;
  }, [campaigns, selectedCampaignId]);

  const handleSelectCampaign = (campaign: CallCampaign) => {
    setSelectedCampaignId(campaign.id);
    onCampaignSelected?.(campaign.id);
  };

  const handleBack = () => {
    setSelectedCampaignId(null);
    onCampaignSelected?.(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateCampaign({ id, updates: { status } });
  };

  if (selectedCampaign) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar às Campanhas</span>
            </Button>
            <div className="h-4 w-[1px] bg-border/60" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{selectedCampaign.name}</span>
              {selectedCampaign.isPriority && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                  ⚡ Prioritária
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tip / explanation card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-muted-foreground">
            <p className="font-semibold text-foreground">
              Configurações do Card de Atendimento desta Campanha
            </p>
            <p>
              As abas abaixo definem exatamente o que os operadores verão no card de chamada: as{" "}
              <strong>retentativas e prioridade</strong> (Configuração), o <strong>roteiro</strong> orientado do operador (Roteiro), e as <strong>ações rápidas</strong> de encerramento e automação (Ações).
            </p>
          </div>
        </div>

        {/* Full Details Component */}
        <CallCampaignDetails
          campaign={selectedCampaign}
          onBack={handleBack}
          onUpdate={updateCampaign}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Megaphone className="h-6 w-6 text-primary" />
            Campanhas de Ligação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie regras, retentativas, roteiros de script e botões de ação do card da ligação.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2 shrink-0 cursor-pointer shadow-sm shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Campanha</span>
        </Button>
      </div>

      {/* Overview Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total de Campanhas</p>
              <p className="text-xl font-bold">{campaigns.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Campanhas Ativas</p>
              <p className="text-xl font-bold">
                {campaigns.filter((c) => c.status === "active").length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Campanhas Prioritárias</p>
              <p className="text-xl font-bold">
                {campaigns.filter((c) => c.isPriority).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <CallCampaignList
        campaigns={campaigns}
        isLoading={isLoading}
        onSelect={handleSelectCampaign}
        onDelete={deleteCampaign}
        onStatusChange={handleStatusChange}
        onCreateNew={() => setShowCreateDialog(true)}
        onDuplicate={duplicateCampaign}
        isDuplicating={isDuplicating}
      />

      {/* Create Dialog */}
      <CreateCampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={createCampaign}
        isCreating={isCreating}
      />
    </div>
  );
}
