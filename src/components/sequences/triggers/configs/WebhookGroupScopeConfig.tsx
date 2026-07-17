import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignGroups } from "@/hooks/useCampaignGroups";
import type { TriggerConfig } from "@/components/group-campaigns/sequences/triggerTypes";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
interface WebhookGroupScopeConfigProps {
  campaignId: string;
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

export function WebhookGroupScopeConfig({ campaignId, config, onChange }: WebhookGroupScopeConfigProps) {
  const { activeCompanyId } = useCompany();
  const [instances, setInstances] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [search, setSearch] = useState("");
  const { linkedGroups, isLoading, addGroups, isAdding } = useCampaignGroups(campaignId);

  // Instance groups state
  const [instanceGroups, setInstanceGroups] = useState<{ jid: string; name: string }[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [importSelectedJids, setImportSelectedJids] = useState<string[]>([]);

  useEffect(() => {
    const fetchInstances = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      let instancesQuery = supabase
        .from("instances")
        .select("id, name, phone")
        .order("name", { ascending: true });

      if (activeCompanyId) {
        instancesQuery = instancesQuery.eq("company_id", activeCompanyId);
      } else {
        instancesQuery = instancesQuery.eq("user_id", user.id).is("company_id", null);
      }

      instancesQuery.then(({ data }) => { if (data) setInstances(data); });
    };

    fetchInstances();
  }, [activeCompanyId]);

  const fetchInstanceGroups = async () => {
    if (!config.instanceId) return;
    setIsFetchingGroups(true);
    setInstanceGroups([]);
    setImportSelectedJids([]);
    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          instanceId: config.instanceId,
          endpoint: "/groups",
          method: "GET",
        },
      });
      if (error) throw error;
      const list = (data || [])
        .filter((item: any) => item.isGroup === true || item.phone?.includes("-") || item.phone?.includes("@g.us") || item.jid?.includes("@g.us"))
        .map((item: any) => ({
          jid: item.phone || item.jid,
          name: item.name || "Grupo sem nome",
        }));
      setInstanceGroups(list);
      toast.success(`${list.length} grupo(s) encontrado(s) na instância.`);
    } catch (err) {
      console.error("Error fetching groups from instance:", err);
      toast.error("Falha ao buscar grupos da instância. Verifique se o WhatsApp está conectado.");
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleImport = async () => {
    if (importSelectedJids.length === 0 || !config.instanceId) return;
    const alreadyLinkedJids = new Set(linkedGroups.map(g => g.groupJid));
    const selectedList = instanceGroups
      .filter(g => importSelectedJids.includes(g.jid) && !alreadyLinkedJids.has(g.jid))
      .map(g => ({ jid: g.jid, name: g.name, instanceId: config.instanceId }));
    
    if (selectedList.length === 0) {
      setIsImportOpen(false);
      return;
    }
    
    try {
      await addGroups(selectedList);
      setIsImportOpen(false);
      // Auto-toggle newly-imported groups in selected list
      const currentSelected = config.selectedGroupJids || [];
      const nextSelected = Array.from(new Set([...currentSelected, ...selectedList.map(s => s.jid)]));
      onChange({ ...config, selectedGroupJids: nextSelected });
    } catch (err) {
      console.error("Error importing groups:", err);
    }
  };

  const groupScope = config.groupScope || "all";
  const selectedGroupJids = config.selectedGroupJids || [];
  const filteredGroups = linkedGroups.filter(g =>
    !search.trim() || g.groupName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggleGroup = (jid: string) => {
    const next = selectedGroupJids.includes(jid)
      ? selectedGroupJids.filter(j => j !== jid)
      : [...selectedGroupJids, jid];
    onChange({ ...config, selectedGroupJids: next });
  };

  const filteredInstanceGroups = instanceGroups.filter(g =>
    !importSearch.trim() || g.name.toLowerCase().includes(importSearch.trim().toLowerCase())
  );

  return (
    <div className="space-y-3 p-3 rounded-lg bg-background border">
      <div className="space-y-2">
        <Label className="text-sm">Instância</Label>
        <Select value={config.instanceId || ""} onValueChange={(v) => onChange({ ...config, instanceId: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione a instância..." /></SelectTrigger>
          <SelectContent>
            {instances.map(i => (
              <SelectItem key={i.id} value={i.id}>{i.name} ({i.phone || "Sem número"})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Grupos de destino</Label>
          {config.instanceId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchInstanceGroups();
                setIsImportOpen(true);
              }}
              className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary/80"
            >
              + Vincular Grupos
            </Button>
          )}
        </div>
        <RadioGroup value={groupScope} onValueChange={(v) => onChange({ ...config, groupScope: v as "all" | "selected" })}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="all" id="scope-all" />
            <Label htmlFor="scope-all" className="text-sm font-normal cursor-pointer">Todos os grupos da campanha</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="selected" id="scope-selected" />
            <Label htmlFor="scope-selected" className="text-sm font-normal cursor-pointer">Grupos selecionados</Label>
          </div>
        </RadioGroup>
      </div>

      {groupScope === "selected" && (
        <div className="space-y-2 pl-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-2">Carregando grupos...</p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum grupo vinculado à campanha.</p>
            ) : (
              filteredGroups.map(g => (
                <div key={g.id} className="flex items-center gap-2 p-1">
                  <Checkbox
                    id={`group-${g.id}`}
                    checked={selectedGroupJids.includes(g.groupJid)}
                    onCheckedChange={() => toggleGroup(g.groupJid)}
                  />
                  <Label htmlFor={`group-${g.id}`} className="text-xs font-normal cursor-pointer flex-1 truncate">
                    {g.groupName}
                  </Label>
                </div>
              ))
            )}
          </div>
          {selectedGroupJids.length > 0 && (
            <p className="text-[10px] text-muted-foreground">{selectedGroupJids.length} grupo(s) selecionado(s)</p>
          )}
        </div>
      )}

      {/* Group Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Vincular Grupos da Instância</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchInstanceGroups}
                disabled={isFetchingGroups}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingGroups ? "animate-spin" : ""}`} />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
                placeholder="Buscar por nome..."
                className="h-9 pl-8 text-sm"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2 bg-slate-50/50">
              {isFetchingGroups ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Listando grupos da instância...</p>
                </div>
              ) : filteredInstanceGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum grupo encontrado.</p>
              ) : (
                filteredInstanceGroups.map(g => {
                  const alreadyLinkedJids = new Set(linkedGroups.map(lg => lg.groupJid));
                  const isLinked = alreadyLinkedJids.has(g.jid);
                  const isChecked = isLinked || importSelectedJids.includes(g.jid);
                  return (
                    <div key={g.jid} className="flex items-center gap-2 p-1.5 hover:bg-slate-100/50 rounded-lg">
                      <Checkbox
                        id={`import-group-${g.jid}`}
                        checked={isChecked}
                        disabled={isLinked}
                        onCheckedChange={() => {
                          setImportSelectedJids(prev =>
                            isChecked ? prev.filter(j => j !== g.jid) : [...prev, g.jid]
                          );
                        }}
                      />
                      <Label
                        htmlFor={`import-group-${g.jid}`}
                        className={`text-xs font-medium cursor-pointer flex-1 truncate ${isLinked ? "text-slate-400" : ""}`}
                      >
                        {g.name}
                      </Label>
                      {isLinked && (
                        <span className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0 ml-auto font-medium">
                          Já vinculado
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsImportOpen(false)} disabled={isAdding}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importSelectedJids.length === 0 || isAdding}
              className="min-w-[120px]"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : `Vincular (${importSelectedJids.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
