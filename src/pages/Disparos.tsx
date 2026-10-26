import { useState } from "react";
import {
  BroadcastStats,
  BroadcastList,
  NewBroadcastWizard,
  BroadcastDetailsModal,
} from "@/components/broadcasts";
import { useBroadcastCampaigns } from "@/hooks/useBroadcastCampaigns";
import { BroadcastCampaign } from "@/types/broadcast.types";
import { Button } from "@/components/ui/button";
import { Radio, Plus, RefreshCw } from "lucide-react";

export default function Disparos() {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<BroadcastCampaign | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const {
    campaigns,
    isLoading,
    refetch,
    createBroadcast,
    isCreating,
    dispatchBatch,
    isDispatching,
    pauseBroadcast,
    resumeBroadcast,
    deleteBroadcast,
  } = useBroadcastCampaigns();

  const handleSelectCampaign = (campaign: BroadcastCampaign) => {
    setSelectedCampaign(campaign);
    setShowDetails(true);
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Disparos em Massa
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Selecione a audiência, acione fluxos automatizados e proteja suas linhas com a cadência Anti-Ban.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setShowWizard(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 gap-1.5 font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Disparo
          </Button>
        </div>
      </div>

      {/* KPI Stats Section */}
      <BroadcastStats campaigns={campaigns} />

      {/* Main Campaign List Section */}
      <BroadcastList
        campaigns={campaigns}
        isLoading={isLoading}
        onSelect={handleSelectCampaign}
        onCreateNew={() => setShowWizard(true)}
        onDispatchBatch={dispatchBatch}
        onPause={pauseBroadcast}
        onResume={resumeBroadcast}
        onDelete={deleteBroadcast}
        isDispatching={isDispatching}
      />

      {/* New Broadcast Wizard Modal */}
      <NewBroadcastWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSubmit={createBroadcast}
        isCreating={isCreating}
      />

      {/* Details & Recipients Modal */}
      <BroadcastDetailsModal
        campaign={selectedCampaign}
        open={showDetails}
        onOpenChange={setShowDetails}
        onDispatchBatch={dispatchBatch}
        isDispatching={isDispatching}
      />
    </div>
  );
}
