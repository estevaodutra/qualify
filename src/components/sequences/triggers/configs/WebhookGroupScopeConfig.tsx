import { useEffect, useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Loader2, RefreshCw, Trash2, AlertCircle } from "lucide-react";
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
  const [instances, setInstances] = useState<{ id: string; name: string; phone: string | null; status: string | null }[]>([]);
  const [search, setSearch] = useState("");
  const { linkedGroups, isLoading, addGroups, removeGroup, isAdding, isRemoving } = useCampaignGroups(campaignId);

  // Normalize instanceIds
  const selectedInstanceIds = useMemo(() => {
    let ids: string[] = [];
    if (Array.isArray(config.instanceIds)) {
      ids = config.instanceIds;
    } else if (config.instanceId) {
      ids = [config.instanceId];
    }
    return ids;
  }, [config.instanceIds, config.instanceId]);

  const toggleInstance = (id: string) => {
    const next = selectedInstanceIds.includes(id)
      ? selectedInstanceIds.filter((i) => i !== id)
      : [...selectedInstanceIds, id];
    
    // Convert to the new format
    onChange({
      ...config,
      instanceIds: next,
    });
  };

  const destinationMode = config.destinationMode || (config.isGroup !== false ? "groups" : "individual");

  // Duplicate phone warning
  const duplicatePhoneWarning = useMemo(() => {
    const selectedInstances = instances.filter(i => selectedInstanceIds.includes(i.id));
    const phones = selectedInstances.map(i => i.phone).filter(Boolean);
    const uniquePhones = new Set(phones);
    if (phones.length > uniquePhones.size) {
      return true;
    }
    return false;
  }, [instances, selectedInstanceIds]);

  const handleRemoveGroup = async (groupId: string, groupJid: string) => {
    try {
      await removeGroup(groupId);
      const currentSelected = config.selectedGroupJids || [];
      if (currentSelected.includes(groupJid)) {
        const next = currentSelected.filter(j => j !== groupJid);
        onChange({ ...config, selectedGroupJids: next });
      }
    } catch (err) {
      console.error("Error removing group:", err);
    }
  };

  // Instance groups state for Import Modal
  const [instanceGroups, setInstanceGroups] = useState<{ jid: string; name: string }[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [importSelectedJids, setImportSelectedJids] = useState<string[]>([]);
  const [importTargetInstanceId, setImportTargetInstanceId] = useState<string>("");

  useEffect(() => {
    const fetchInstances = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      let instancesQuery = supabase
        .from("instances")
        .select("id, name, phone, status")
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

  const fetchInstanceGroups = async (targetInstanceId: string) => {
    if (!targetInstanceId) return;
    setIsFetchingGroups(true);
    setInstanceGroups([]);
    setImportSelectedJids([]);
    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          instanceId: targetInstanceId,
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
    if (importSelectedJids.length === 0 || !importTargetInstanceId) return;
    const alreadyLinkedJids = new Set(linkedGroups.map(g => g.groupJid));
    const selectedList = instanceGroups
      .filter(g => importSelectedJids.includes(g.jid) && !alreadyLinkedJids.has(g.jid))
      .map(g => ({ jid: g.jid, name: g.name, instanceId: importTargetInstanceId }));
    
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

  const groupsByInstance = useMemo(() => {
    return filteredGroups.reduce((acc, group) => {
      const instId = group.instanceId || "unknown";
      if (!acc[instId]) acc[instId] = [];
      acc[instId].push(group);
      return acc;
    }, {} as Record<string, typeof filteredGroups>);
  }, [filteredGroups]);

  const toggleGroup = (jid: string) => {
    const next = selectedGroupJids.includes(jid)
      ? selectedGroupJids.filter(j => j !== jid)
      : [...selectedGroupJids, jid];
    onChange({ ...config, selectedGroupJids: next });
  };

  const filteredInstanceGroups = instanceGroups.filter(g =>
    !importSearch.trim() || g.name.toLowerCase().includes(importSearch.trim().toLowerCase())
  );

  const handleOpenImport = () => {
    if (selectedInstanceIds.length > 0) {
      const target = importTargetInstanceId || selectedInstanceIds[0];
      setImportTargetInstanceId(target);
      fetchInstanceGroups(target);
      setIsImportOpen(true);
    }
  };

  return (
    <div className="space-y-4 rounded-lg bg-transparent">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Instâncias responsáveis</Label>
        <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white">
          {instances.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhuma instância encontrada.</p>
          ) : (
            instances.map(i => (
              <div key={i.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded transition-colors">
                <Checkbox
                  id={`instance-${i.id}`}
                  checked={selectedInstanceIds.includes(i.id)}
                  onCheckedChange={() => toggleInstance(i.id)}
                />
                <Label htmlFor={`instance-${i.id}`} className="text-xs font-normal cursor-pointer flex-1 flex items-center gap-2 truncate">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      i.status === "connected" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    title={i.status === "connected" ? "Conectada" : "Desconectada"}
                  />
                  <span>{i.name} <span className="text-muted-foreground ml-1">({i.phone || "Sem número"})</span></span>
                </Label>
              </div>
            ))
          )}
        </div>
        
        {duplicatePhoneWarning && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg animate-in fade-in zoom-in-95">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs font-medium">
              Atenção: Você selecionou instâncias com o mesmo número conectado. Para evitar disparos duplicados, selecione apenas uma delas.
            </p>
          </div>
        )}
      </div>

      {destinationMode === "groups" && (
        <>
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Grupos de destino</Label>
              {selectedInstanceIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenImport}
                  className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary/80"
                >
                  + Vincular Grupos
                </Button>
              )}
            </div>
            <RadioGroup value={groupScope} onValueChange={(v) => onChange({ ...config, groupScope: v as "all" | "selected" })}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all" className="text-sm font-normal cursor-pointer">Todos os grupos vinculados</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="selected" id="scope-selected" />
                <Label htmlFor="scope-selected" className="text-sm font-normal cursor-pointer">Grupos selecionados</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {groupScope === "selected" && (
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar grupo..."
                  className="h-8 pl-8 text-xs bg-white"
                />
              </div>
            )}
            
            <div className="max-h-60 overflow-y-auto space-y-3 border rounded-lg p-3 bg-white">
              {isLoading ? (
                <p className="text-xs text-muted-foreground text-center py-2">Carregando grupos...</p>
              ) : linkedGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum grupo vinculado.</p>
              ) : (
                Object.entries(groupsByInstance).map(([instId, groups]) => {
                  const instance = instances.find(i => i.id === instId);
                  const instanceName = instance ? `${instance.name} (${instance.phone || "Sem número"})` : "Instância Desconhecida";
                  
                  return (
                    <div key={instId} className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                        {instanceName}
                      </div>
                      <div className="space-y-0.5 pl-1">
                        {groups.map(g => (
                          <div key={g.id} className="flex items-center justify-between gap-2 p-1.5 group/item hover:bg-slate-50 rounded transition-colors">
                            {groupScope === "selected" ? (
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Checkbox
                                  id={`group-${g.id}`}
                                  checked={selectedGroupJids.includes(g.groupJid)}
                                  onCheckedChange={() => toggleGroup(g.groupJid)}
                                />
                                <Label htmlFor={`group-${g.id}`} className="text-xs font-normal cursor-pointer flex-1 truncate py-0.5">
                                  {g.groupName}
                                </Label>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-700 truncate flex-1 px-1">{g.groupName}</span>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveGroup(g.id, g.groupJid)}
                              disabled={isRemoving}
                              className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:opacity-100 transition-all opacity-80 md:opacity-0 md:group-hover/item:opacity-100 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {groupScope === "selected" && selectedGroupJids.length > 0 && (
              <p className="text-[10px] text-muted-foreground">{selectedGroupJids.length} grupo(s) selecionado(s)</p>
            )}
          </div>
        </>
      )}

      {/* Group Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Vincular Grupos</span>
              {importTargetInstanceId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchInstanceGroups(importTargetInstanceId)}
                  disabled={isFetchingGroups}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetchingGroups ? "animate-spin" : ""}`} />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Buscar grupos de qual instância?</Label>
              <Select 
                value={importTargetInstanceId} 
                onValueChange={(val) => {
                  setImportTargetInstanceId(val);
                  fetchInstanceGroups(val);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {instances.filter(i => selectedInstanceIds.includes(i.id)).map(i => (
                    <SelectItem key={i.id} value={i.id} className="text-xs">
                      {i.name} ({i.phone || "Sem número"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
            <Button variant="ghost" onClick={() => setIsImportOpen(false)} disabled={isAdding} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importSelectedJids.length === 0 || isAdding}
              className="min-w-[120px] h-8 text-xs"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : `Vincular (${importSelectedJids.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

