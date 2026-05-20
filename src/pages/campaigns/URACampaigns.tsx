import { useState } from "react";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { useURACampaigns, URACampaign } from "@/hooks/useURACampaigns";
import { URACampaignList, URACampaignDetails, CreateURACampaignDialog } from "@/components/ura-campaigns";

export default function URACampaigns() {
  const {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    duplicateCampaign,
    isCreating,
    isDuplicating,
  } = useURACampaigns();

  const [selectedCampaign, setSelectedCampaign] = useState<URACampaign | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSelect = (campaign: URACampaign) => {
    setSelectedCampaign(campaign);
  };

  const handleBack = () => {
    setSelectedCampaign(null);
  };

  const handleUpdate = async ({ id, updates }: { id: string; updates: Partial<URACampaign> }) => {
    const updated = await updateCampaign({ id, updates });
    if (selectedCampaign && selectedCampaign.id === id) {
      setSelectedCampaign(updated);
    }
    return updated;
  };

  const handleStatusChange = async (id: string, status: URACampaign["status"]) => {
    await updateCampaign({ id, updates: { status } });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="telefonia" type="URA" />

      {selectedCampaign ? (
        <URACampaignDetails
          campaign={selectedCampaign}
          onBack={handleBack}
          onUpdate={handleUpdate}
        />
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campanhas de URA</h1>
            <p className="text-muted-foreground">Fluxo de áudio interativo com teclado telefônico (DTMF)</p>
          </div>

          <URACampaignList
            campaigns={campaigns}
            isLoading={isLoading}
            onSelect={handleSelect}
            onDelete={deleteCampaign}
            onStatusChange={handleStatusChange}
            onCreateNew={() => setShowCreateDialog(true)}
            onDuplicate={duplicateCampaign}
            isDuplicating={isDuplicating}
          />
        </>
      )}

      <CreateURACampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={createCampaign}
        isCreating={isCreating}
      />
    </div>
  );
}
