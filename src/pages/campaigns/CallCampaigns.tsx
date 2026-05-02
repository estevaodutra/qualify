import { useState } from "react";
import { PhoneCall } from "lucide-react";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { useCallCampaigns, CallCampaign } from "@/hooks/useCallCampaigns";
import { CallCampaignList, CallCampaignDetails, CreateCampaignDialog } from "@/components/call-campaigns";

export default function CallCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<CallCampaign | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign, duplicateCampaign, isCreating, isDuplicating } = useCallCampaigns();

  const handleSelectCampaign = (campaign: CallCampaign) => {
    setSelectedCampaign(campaign);
  };

  const handleBack = () => {
    // Refresh the selected campaign from the list
    if (selectedCampaign) {
      const updated = campaigns.find((c) => c.id === selectedCampaign.id);
      if (updated) {
        setSelectedCampaign(null);
      } else {
        setSelectedCampaign(null);
      }
    } else {
      setSelectedCampaign(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateCampaign({ id, updates: { status } });
  };

  if (selectedCampaign) {
    // Find the latest version from campaigns list
    const latestCampaign = campaigns.find((c) => c.id === selectedCampaign.id) || selectedCampaign;
    
    return (
      <div className="space-y-6 animate-fade-in">
        <CampaignBreadcrumb channel="telefonia" type="Ligação" />
        <CallCampaignDetails
          campaign={latestCampaign}
          onBack={handleBack}
          onUpdate={updateCampaign}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="telefonia" type="Ligação" />
      
      <div>
        <h1 className="text-2xl font-bold">Campanhas de Ligação</h1>
        <p className="text-muted-foreground">Gerencie campanhas de ligações telefônicas</p>
      </div>

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

      <CreateCampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={createCampaign}
        isCreating={isCreating}
      />
    </div>
  );
}
