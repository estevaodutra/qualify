import { useEffect, useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Folder, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TriggerConfig } from "@/components/group-campaigns/sequences/triggerTypes";
import { useCompany } from "@/contexts/CompanyContext";
import { useGroups } from "@/hooks/useGroups";
import { useGroupFolders } from "@/hooks/useGroupFolders";

interface WebhookGroupScopeConfigProps {
  campaignId: string;
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

export function WebhookGroupScopeConfig({ config, onChange }: WebhookGroupScopeConfigProps) {
  const { activeCompanyId } = useCompany();
  const [instances, setInstances] = useState<{ id: string; name: string; phone: string | null; status: string | null }[]>([]);
  const [search, setSearch] = useState("");

  // Fetch folders and groups from the central system
  const { data: foldersData } = useGroupFolders();
  const folders = foldersData || [];
  const { data: groupsData, isLoading: isLoadingGroups } = useGroups({ pageSize: 5000 });
  const groups = groupsData?.groups || [];

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Normalize selected instanceIds
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
    onChange({ ...config, instanceIds: next });
  };

  const destinationMode = config.destinationMode || (config.isGroup !== false ? "groups" : "individual");

  const duplicatePhoneWarning = useMemo(() => {
    const selectedInstances = instances.filter(i => selectedInstanceIds.includes(i.id));
    const phones = selectedInstances.map(i => i.phone).filter(Boolean);
    const uniquePhones = new Set(phones);
    return phones.length > uniquePhones.size;
  }, [instances, selectedInstanceIds]);

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

  const selectedGroupJids = config.selectedGroupJids || [];

  const toggleGroup = (jid: string | null) => {
    if (!jid) return;
    const next = selectedGroupJids.includes(jid)
      ? selectedGroupJids.filter(j => j !== jid)
      : [...selectedGroupJids, jid];
    onChange({ ...config, selectedGroupJids: next, groupScope: "selected" });
  };

  const toggleFolder = (folderId: string) => {
    const folderGroups = groups.filter(g => g.folderId === folderId).map(g => g.groupJid).filter(Boolean) as string[];
    const allSelected = folderGroups.length > 0 && folderGroups.every(jid => selectedGroupJids.includes(jid));
    
    let next = [...selectedGroupJids];
    if (allSelected) {
      next = next.filter(jid => !folderGroups.includes(jid));
    } else {
      folderGroups.forEach(jid => {
        if (!next.includes(jid)) next.push(jid);
      });
    }
    onChange({ ...config, selectedGroupJids: next, groupScope: "selected" });
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Filter groups
  const filteredGroups = groups.filter(g => !search.trim() || g.name.toLowerCase().includes(search.trim().toLowerCase()));

  // Get groups without folders (or if searching, show all matching groups directly)
  const noFolderGroups = search.trim() ? filteredGroups : filteredGroups.filter(g => !g.folderId);
  const foldersToShow = search.trim() ? [] : folders;

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
                    className={`h-2 w-2 shrink-0 rounded-full ${i.status === "connected" ? "bg-emerald-500" : "bg-rose-500"}`}
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
            <Label className="text-sm font-semibold">Grupos de destino</Label>
          </div>

          <div className="space-y-2 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar grupo..."
                className="h-8 pl-8 text-xs bg-white"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 bg-white">
              {isLoadingGroups ? (
                <p className="text-xs text-muted-foreground text-center py-2">Carregando grupos...</p>
              ) : filteredGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum grupo encontrado.</p>
              ) : (
                <div className="space-y-1">
                  {foldersToShow.map(folder => {
                    const folderGroups = filteredGroups.filter(g => g.folderId === folder.id);
                    if (folderGroups.length === 0) return null;
                    const folderGroupJids = folderGroups.map(g => g.groupJid).filter(Boolean) as string[];
                    const allSelected = folderGroupJids.length > 0 && folderGroupJids.every(jid => selectedGroupJids.includes(jid));
                    const isExpanded = expandedFolders[folder.id];

                    return (
                      <div key={folder.id} className="flex flex-col">
                        <div className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded transition-colors group/folder">
                          <button onClick={() => toggleFolderExpand(folder.id)} className="p-0.5 text-slate-400 hover:text-slate-700">
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          <Checkbox
                            id={`folder-${folder.id}`}
                            checked={allSelected}
                            onCheckedChange={() => toggleFolder(folder.id)}
                          />
                          <Label htmlFor={`folder-${folder.id}`} className="text-xs font-semibold cursor-pointer flex-1 truncate flex items-center gap-1.5">
                            <Folder className="h-3.5 w-3.5 text-slate-400" fill={folder.color || "#cbd5e1"} stroke="none" />
                            {folder.name}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">({folderGroups.length})</span>
                          </Label>
                        </div>
                        
                        {isExpanded && (
                          <div className="pl-7 space-y-0.5 mt-0.5">
                            {folderGroups.map(g => (
                              <div key={g.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded transition-colors">
                                <Checkbox
                                  id={`group-${g.id}`}
                                  checked={g.groupJid ? selectedGroupJids.includes(g.groupJid) : false}
                                  onCheckedChange={() => toggleGroup(g.groupJid)}
                                />
                                <Label htmlFor={`group-${g.id}`} className="text-[11px] font-normal cursor-pointer flex-1 truncate">
                                  {g.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Sem pasta */}
                  {noFolderGroups.map(g => (
                    <div key={g.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded transition-colors">
                      <Checkbox
                        id={`group-${g.id}`}
                        checked={g.groupJid ? selectedGroupJids.includes(g.groupJid) : false}
                        onCheckedChange={() => toggleGroup(g.groupJid)}
                      />
                      <Label htmlFor={`group-${g.id}`} className="text-xs font-normal cursor-pointer flex-1 truncate">
                        {g.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedGroupJids.length > 0 && (
              <p className="text-[10px] text-muted-foreground">{selectedGroupJids.length} grupo(s) selecionado(s)</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
