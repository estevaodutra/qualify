import { useState } from "react";
import { useProspectingCampaigns, ProspectingCampaign, CreateProspectingInput } from "@/hooks/useProspectingCampaigns";
import { ProspectingCampaignList, ProspectingWizard } from "@/components/prospecting-campaigns";
import { toast } from "sonner";
import { Search } from "lucide-react";

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

  const handleCreate = async (data: CreateProspectingInput) => {
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
    <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-1 min-h-0 bg-background/50 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-foreground tracking-tight m-0 font-['Sora'] flex items-center gap-2">
          <Search className="h-5 w-5 text-[#8A3CFF]" />
          Prospecção
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Busque por novos leads no Google Maps e configure ações automáticas pós-prospecção.
        </p>
      </div>

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

      <ProspectingWizard
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
