import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n";
import { useGroupCampaigns, useImportGroupCampaign, GroupCampaign } from "@/hooks/useGroupCampaigns";
import { GroupCampaignList, GroupCampaignDetails, CreateGroupDialog } from "@/components/group-campaigns";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function GroupCampaignsPage() {
  const { t } = useLanguage();
  const [selectedCampaign, setSelectedCampaign] = useState<GroupCampaign | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const importMutation = useImportGroupCampaign();
  
  const { 
    campaigns, 
    isLoading, 
    createCampaign,
    updateCampaign, 
    deleteCampaign 
  } = useGroupCampaigns();

  const handleCreate = async (data: {
    name: string;
    instanceId?: string;
    groupName?: string;
    groupDescription?: string;
  }) => {
    try {
      setIsCreating(true);
      await createCampaign({
        name: data.name,
        instanceId: data.instanceId,
        groupName: data.groupName,
        groupDescription: data.groupDescription,
      });
      setShowCreateDialog(false);
      toast.success(t("groupCampaigns.campaignCreated"));
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateCampaign({
        id,
        updates: { status },
      });
      toast.success(status === "active" ? t("groupCampaigns.campaignActivated") : t("groupCampaigns.campaignPaused"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
      toast.success(t("groupCampaigns.campaignDeleted"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleImport = () => {
    setImportError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      setImportError("JSON inválido. Verifique o formato.");
      return;
    }
    if (parsed.type !== "group_campaign") {
      setImportError("Tipo inválido — o campo 'type' deve ser 'group_campaign'.");
      return;
    }
    importMutation.mutate(parsed, {
      onSuccess: () => {
        setShowImportDialog(false);
        setImportJson("");
        setImportError(null);
      },
    });
  };

  const handleUpdate = async (id: string, updates: Partial<GroupCampaign>) => {
    try {
      await updateCampaign({ id, updates });
      // Update selectedCampaign with new values
      if (selectedCampaign && selectedCampaign.id === id) {
        setSelectedCampaign({
          ...selectedCampaign,
          ...updates,
        });
      }
      toast.success(t("common.success"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  // Sync selectedCampaign when campaigns list updates
  useEffect(() => {
    if (selectedCampaign && campaigns) {
      const updatedCampaign = campaigns.find(c => c.id === selectedCampaign.id);
      if (updatedCampaign) {
        setSelectedCampaign(updatedCampaign);
      }
    }
  }, [campaigns]);

  return (
    <div className="space-y-6 animate-fade-in">
      <CampaignBreadcrumb channel="whatsapp" type="Grupos" />
      
      {selectedCampaign ? (
        <GroupCampaignDetails
          campaign={selectedCampaign}
          onBack={() => setSelectedCampaign(null)}
          onUpdate={handleUpdate}
        />
      ) : (
        <GroupCampaignList
          campaigns={campaigns || []}
          isLoading={isLoading}
          onSelect={setSelectedCampaign}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onCreateNew={() => setShowCreateDialog(true)}
          onImport={() => setShowImportDialog(true)}
        />
      )}

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
        isCreating={isCreating}
      />

      <Dialog open={showImportDialog} onOpenChange={open => { setShowImportDialog(open); if (!open) { setImportJson(""); setImportError(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Importar Campanha
            </DialogTitle>
            <DialogDescription>
              Cole o JSON exportado do DispatchOne abaixo.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="font-mono text-xs min-h-[220px]"
            placeholder='{"version":"1.0","type":"group_campaign",...}'
            value={importJson}
            onChange={e => { setImportJson(e.target.value); setImportError(null); }}
          />
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowImportDialog(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importMutation.isPending || !importJson.trim()}>
              {importMutation.isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
