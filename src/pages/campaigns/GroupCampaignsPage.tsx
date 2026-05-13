import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n";
import { useGroupCampaigns, useImportGroupCampaign, GroupCampaign } from "@/hooks/useGroupCampaigns";
import { GroupCampaignList, GroupCampaignDetails, CreateGroupDialog } from "@/components/group-campaigns";
import { CampaignBreadcrumb } from "@/components/campaigns";
import { toast } from "sonner";
import { Upload, CheckCircle2, XCircle } from "lucide-react";
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
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importValid, setImportValid] = useState<boolean | null>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setImportFileName(file.name);
      setImportValid(false);
      setImportError("O arquivo deve ter extensão .json");
      setImportJson("");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportFileName(file.name);
      setImportError(null);
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportError("Arquivo JSON inválido ou corrompido.");
        setImportValid(false);
        setImportJson("");
        return;
      }
      if (parsed.type !== "group_campaign") {
        setImportError("Arquivo inválido — o campo 'type' deve ser 'group_campaign'.");
        setImportValid(false);
        setImportJson("");
        return;
      }
      setImportJson(text);
      setImportValid(true);
      setImportError(null);
    };
    reader.readAsText(file);
    e.target.value = "";
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

      <Dialog open={showImportDialog} onOpenChange={open => {
        setShowImportDialog(open);
        if (!open) { setImportJson(""); setImportError(null); setImportFileName(null); setImportValid(null); }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Importar Campanha
            </DialogTitle>
            <DialogDescription>
              Selecione um arquivo .json ou cole o conteúdo abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Zona de upload */}
            <label
              htmlFor="import-file-input"
              className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors select-none
                ${importValid === true
                  ? "border-emerald-500 bg-emerald-500/5"
                  : importValid === false
                  ? "border-destructive bg-destructive/5"
                  : "border-muted-foreground/30 bg-muted/30 hover:bg-muted/50"
                }`}
            >
              {importValid === true ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                  <span className="text-sm font-medium text-emerald-600">{importFileName}</span>
                  <span className="text-xs text-muted-foreground">Arquivo válido · clique para trocar</span>
                </>
              ) : importValid === false ? (
                <>
                  <XCircle className="h-6 w-6 text-destructive mb-1" />
                  <span className="text-sm font-medium text-destructive">{importFileName}</span>
                  <span className="text-xs text-muted-foreground">Clique para selecionar outro arquivo</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar arquivo .json</span>
                </>
              )}
              <input
                id="import-file-input"
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {/* Separador */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou cole o JSON</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Textarea */}
            <Textarea
              className="font-mono text-xs min-h-[140px]"
              placeholder='{"version":"1.0","type":"group_campaign",...}'
              value={importJson}
              onChange={e => {
                setImportJson(e.target.value);
                setImportError(null);
                setImportValid(null);
                setImportFileName(null);
              }}
            />
          </div>

          {importError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 flex-shrink-0" /> {importError}
            </p>
          )}

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
