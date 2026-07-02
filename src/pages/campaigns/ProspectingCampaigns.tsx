import { useState } from "react";
import { useProspectingCampaigns } from "@/hooks/useProspectingCampaigns";
import { ProspectingCampaignList, CreateProspectingDialog } from "@/components/prospecting-campaigns";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { toast } from "sonner";

export default function ProspectingCampaigns() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const {
    campaigns,
    isLoading,
    createCampaign,
    deleteCampaign,
    isCreating,
  } = useProspectingCampaigns();

  const handleCreate = async (data: { 
    name: string; 
    searchTerms: string;
    quantity: number;
    category?: string;
    exactNames?: boolean;
    places?: string;
    postActionId?: string;
  }) => {
    try {
      await createCampaign(data);
      setShowCreateDialog(false);
    } catch {
      // toast is already handled in the hook, but we can do extra here if needed
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="whatsapp" type="Prospecção" />

      <ProspectingCampaignList
        campaigns={campaigns}
        isLoading={isLoading}
        onDelete={handleDelete}
        onCreateNew={() => setShowCreateDialog(true)}
      />

      <CreateProspectingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
    </div>
  );
}
