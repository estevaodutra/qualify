import { useState, useEffect } from "react";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { usePirateCampaigns, PirateCampaign } from "@/hooks/usePirateCampaigns";
import { PirateCampaignList, PirateCampaignDetails, CreatePirateCampaignDialog } from "@/components/pirate-campaigns";
import { toast } from "sonner";

export default function PirateCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<PirateCampaign | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign, isCreating } = usePirateCampaigns();

  const handleCreate = async (data: Parameters<typeof createCampaign>[0]) => {
    try {
      await createCampaign(data);
      setShowCreateDialog(false);
      toast.success("Campanha pirata criada!");
    } catch {
      toast.error("Erro ao criar campanha");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateCampaign({ id, updates: { status: status as PirateCampaign["status"] } });
      toast.success(status === "active" ? "Campanha ativada" : "Campanha pausada");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
      toast.success("Campanha removida");
    } catch {
      toast.error("Erro ao excluir campanha");
    }
  };

  const handleUpdate = async (id: string, updates: Partial<PirateCampaign>) => {
    try {
      await updateCampaign({ id, updates });
      if (selectedCampaign?.id === id) {
        setSelectedCampaign({ ...selectedCampaign, ...updates });
      }
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  // Sync selectedCampaign
  useEffect(() => {
    if (selectedCampaign && campaigns) {
      const updated = campaigns.find((c) => c.id === selectedCampaign.id);
      if (updated) setSelectedCampaign(updated);
    }
  }, [campaigns]);

  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="whatsapp" type="Pirata" />

      <div>
        <h1 className="text-2xl font-bold">Campanhas Pirata</h1>
        <p className="text-muted-foreground">Monitore grupos do WhatsApp e capture leads automaticamente</p>
      </div>

      {selectedCampaign ? (
        <PirateCampaignDetails
          campaign={selectedCampaign}
          onBack={() => setSelectedCampaign(null)}
          onUpdate={handleUpdate}
        />
      ) : (
        <PirateCampaignList
          campaigns={campaigns}
          isLoading={isLoading}
          onSelect={setSelectedCampaign}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onCreateNew={() => setShowCreateDialog(true)}
        />
      )}

      <CreatePirateCampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
    </div>
  );
}
