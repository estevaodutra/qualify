import { useState } from "react";
import { useProspectingCampaigns, ProspectingCampaign } from "@/hooks/useProspectingCampaigns";
import { ProspectingCampaignList, CreateProspectingDialog } from "@/components/prospecting-campaigns";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { toast } from "sonner";

export default function ProspectingCampaigns() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ProspectingCampaign | null>(null);

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
      setEditingCampaign(null);
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

  const handleRunAgain = (campaign: ProspectingCampaign) => {
    setEditingCampaign(campaign);
    setShowCreateDialog(true);
  };

  const handleEdit = (campaign: ProspectingCampaign) => {
    setEditingCampaign(campaign);
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="whatsapp" type="Prospecção" />

      <ProspectingCampaignList
        campaigns={campaigns}
        isLoading={isLoading}
        onDelete={handleDelete}
        onCreateNew={() => {
          setEditingCampaign(null);
          setShowCreateDialog(true);
        }}
        onRunAgain={handleRunAgain}
        onEdit={handleEdit}
      />

      <CreateProspectingDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setEditingCampaign(null);
        }}
        onCreate={handleCreate}
        isCreating={isCreating}
        initialData={editingCampaign}
      />
    </div>
  );
}
