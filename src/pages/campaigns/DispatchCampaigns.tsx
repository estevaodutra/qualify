import { useState, useEffect } from "react";
import { useDispatchCampaigns, DispatchCampaign } from "@/hooks/useDispatchCampaigns";
import { DispatchCampaignList, DispatchCampaignDetails, CreateDispatchDialog } from "@/components/dispatch-campaigns";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { toast } from "sonner";

export default function DispatchCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<DispatchCampaign | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    isCreating,
  } = useDispatchCampaigns();

  const handleCreate = async (data: { name: string; description?: string }) => {
    try {
      await createCampaign(data);
      setShowCreateDialog(false);
    } catch {
      toast.error("Erro ao criar campanha");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateCampaign({ id, updates: { status } });
      toast.success(status === "active" ? "Campanha ativada" : "Campanha atualizada");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const handleUpdate = async (id: string, updates: Partial<DispatchCampaign>) => {
    try {
      await updateCampaign({ id, updates });
      if (selectedCampaign && selectedCampaign.id === id) {
        setSelectedCampaign({ ...selectedCampaign, ...updates });
      }
      toast.success("Campanha atualizada");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  // Sync selected campaign with list updates
  useEffect(() => {
    if (selectedCampaign && campaigns) {
      const updated = campaigns.find(c => c.id === selectedCampaign.id);
      if (updated) setSelectedCampaign(updated);
    }
  }, [campaigns]);

  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="whatsapp" type="Disparos" />

      {selectedCampaign ? (
        <DispatchCampaignDetails
          campaign={selectedCampaign}
          onBack={() => setSelectedCampaign(null)}
          onUpdate={handleUpdate}
        />
      ) : (
        <DispatchCampaignList
          campaigns={campaigns}
          isLoading={isLoading}
          onSelect={setSelectedCampaign}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onCreateNew={() => setShowCreateDialog(true)}
        />
      )}

      <CreateDispatchDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
    </div>
  );
}
