import { useEffect, useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  AlertCircle,
  Folder,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Users,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TriggerConfig } from "@/components/group-campaigns/sequences/triggerTypes";
import { useCompany } from "@/contexts/CompanyContext";
import { useGroups, WhatsAppGroupItem } from "@/hooks/useGroups";
import { useGroupFolders, GroupFolder } from "@/hooks/useGroupFolders";

interface GroupEventTriggerConfigProps {
  campaignId?: string;
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

export function GroupEventTriggerConfig({ config, onChange }: GroupEventTriggerConfigProps) {
  const { activeCompanyId } = useCompany();
  const [instances, setInstances] = useState<{ id: string; name: string; phone: string | null; status: string | null }[]>([]);
  const [search, setSearch] = useState("");

  // Fetch folders and groups from the central CRM system
  const { folders = [], assignments = {}, isLoading: isLoadingFolders } = useGroupFolders();
  const { groups = [], isLoading: isLoadingGroups, refetch: refetchGroups } = useGroups({ pageSize: 5000 });

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
    onChange({ ...config, instanceIds: next, instanceId: next[0] || null });
  };

  const duplicatePhoneWarning = useMemo(() => {
    const selectedInstances = instances.filter((i) => selectedInstanceIds.includes(i.id));
    const phones = selectedInstances.map((i) => i.phone).filter(Boolean);
    const uniquePhones = new Set(phones);
    return phones.length > uniquePhones.size;
  }, [instances, selectedInstanceIds]);

  useEffect(() => {
    const fetchInstances = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      instancesQuery.then(({ data }) => {
        if (data) setInstances(data);
      });
    };

    fetchInstances();
  }, [activeCompanyId]);

  const selectedGroupJids = useMemo(() => {
    return Array.isArray(config.selectedGroupJids) ? (config.selectedGroupJids as string[]) : [];
  }, [config.selectedGroupJids]);

  // Helper to resolve folder ID reliably
  const getGroupFolderId = (g: WhatsAppGroupItem): string | null => {
    return (
      g.folderId ||
      (assignments && assignments[g.id]) ||
      (g.groupJid && assignments && assignments[g.groupJid]) ||
      null
    );
  };

  const toggleGroup = (jid: string | null) => {
    if (!jid) return;
    const next = selectedGroupJids.includes(jid)
      ? selectedGroupJids.filter((j) => j !== jid)
      : [...selectedGroupJids, jid];
    onChange({
      ...config,
      selectedGroupJids: next,
      groupScope: "selected",
      isGroup: false,
      destinationMode: "private",
    });
  };

  const toggleFolder = (folderId: string) => {
    const folderGroups = groups.filter((g) => getGroupFolderId(g) === folderId);
    const folderGroupJids = folderGroups
      .map((g) => g.groupJid)
      .filter(Boolean) as string[];

    if (folderGroupJids.length === 0) return;

    const allSelected = folderGroupJids.every((jid) => selectedGroupJids.includes(jid));

    let next = [...selectedGroupJids];
    if (allSelected) {
      // Unselect all groups in folder
      next = next.filter((jid) => !folderGroupJids.includes(jid));
    } else {
      // Select all groups in folder
      folderGroupJids.forEach((jid) => {
        if (!next.includes(jid)) next.push(jid);
      });
    }

    onChange({
      ...config,
      selectedGroupJids: next,
      groupScope: "selected",
      isGroup: false,
      destinationMode: "private",
    });
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
    }));
  };

  const isFolderExpanded = (folderId: string) => {
    // Default open so groups are visible immediately
    return expandedFolders[folderId] !== false;
  };

  const handleSelectAll = () => {
    const allJids = groups.map((g) => g.groupJid).filter(Boolean) as string[];
    const uniqueJids = Array.from(new Set(allJids));
    onChange({
      ...config,
      selectedGroupJids: uniqueJids,
      groupScope: "selected",
      isGroup: false,
      destinationMode: "private",
    });
  };

  const handleDeselectAll = () => {
    onChange({
      ...config,
      selectedGroupJids: [],
      groupScope: "selected",
      isGroup: false,
      destinationMode: "private",
    });
  };

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const term = search.trim().toLowerCase();
    return groups.filter(
      (g) =>
        (g.name && g.name.toLowerCase().includes(term)) ||
        (g.groupJid && g.groupJid.toLowerCase().includes(term))
    );
  }, [groups, search]);

  const validFolderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);

  // Group items without folder (or with deleted/invalid folder)
  const noFolderGroups = useMemo(() => {
    return filteredGroups.filter((g) => {
      const fId = getGroupFolderId(g);
      return !fId || !validFolderIds.has(fId);
    });
  }, [filteredGroups, validFolderIds]);

  const isLoading = isLoadingGroups || isLoadingFolders;

  return (
    <div className="space-y-5 rounded-lg bg-transparent">
      {/* 1. Responsibles Instances */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Instâncias responsáveis
        </Label>
        <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white shadow-sm">
          {instances.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhuma instância encontrada.
            </p>
          ) : (
            instances.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded transition-colors"
              >
                <Checkbox
                  id={`instance-${i.id}`}
                  checked={selectedInstanceIds.includes(i.id)}
                  onCheckedChange={() => toggleInstance(i.id)}
                />
                <Label
                  htmlFor={`instance-${i.id}`}
                  className="text-xs font-normal cursor-pointer flex-1 flex items-center gap-2 truncate"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      i.status === "connected" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    title={i.status === "connected" ? "Conectada" : "Desconectada"}
                  />
                  <span className="font-medium text-slate-800">{i.name}</span>
                  <span className="text-muted-foreground text-[11px]">
                    ({i.phone || "Sem número"})
                  </span>
                </Label>
              </div>
            ))
          )}
        </div>

        {duplicatePhoneWarning && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg animate-in fade-in zoom-in-95">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs font-medium">
              Atenção: Você selecionou instâncias com o mesmo número conectado. Para evitar
              disparos duplicados, selecione apenas uma delas.
            </p>
          </div>
        )}
      </div>

      {/* 2. Monitored Groups */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Grupos Monitorados
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Selecione quais grupos cadastrados na sua conta acionarão este gatilho
            </p>
          </div>
          {selectedGroupJids.length > 0 && (
            <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary">
              {selectedGroupJids.length} selecionado(s)
            </Badge>
          )}
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do grupo..."
              className="h-8 pl-8 text-xs bg-white"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={groups.length === 0}
            className="h-8 px-2 text-[11px] font-medium"
            title="Selecionar todos os grupos"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedGroupJids.length === 0}
            className="h-8 px-2 text-[11px] font-medium"
            title="Limpar seleção"
          >
            <Square className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>

        {/* Groups and Folders List */}
        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white shadow-inner space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Carregando grupos da conta...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-6 px-4 space-y-2">
              <Users className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-600">Nenhum grupo encontrado na conta</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Cadastre ou sincronize grupos na página de <span className="font-semibold">Grupos</span> para que fiquem disponíveis neste gatilho.
              </p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Nenhum grupo corresponde à busca "{search}".
            </div>
          ) : (
            <div className="space-y-1">
              {/* Folders List */}
              {folders.map((folder) => {
                const folderGroups = filteredGroups.filter(
                  (g) => getGroupFolderId(g) === folder.id
                );
                // If searching and this folder has no matching groups, don't show it
                if (folderGroups.length === 0 && search.trim()) return null;

                const folderGroupJids = folderGroups
                  .map((g) => g.groupJid)
                  .filter(Boolean) as string[];

                const selectedCount = folderGroupJids.filter((jid) =>
                  selectedGroupJids.includes(jid)
                ).length;
                const isAllSelected =
                  folderGroupJids.length > 0 && selectedCount === folderGroupJids.length;
                const isSomeSelected = selectedCount > 0 && !isAllSelected;
                const isExpanded = isFolderExpanded(folder.id);

                return (
                  <div
                    key={folder.id}
                    className="border border-slate-100 rounded-md bg-slate-50/50 overflow-hidden mb-1"
                  >
                    {/* Folder Header */}
                    <div className="flex items-center gap-2 p-1.5 hover:bg-slate-100/80 rounded transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleFolderExpand(folder.id)}
                        className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                        title={isExpanded ? "Recolher pasta" : "Expandir pasta"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <Checkbox
                        id={`folder-${folder.id}`}
                        checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                        onCheckedChange={() => toggleFolder(folder.id)}
                        disabled={folderGroupJids.length === 0}
                      />

                      <Label
                        htmlFor={`folder-${folder.id}`}
                        className="text-xs font-semibold cursor-pointer flex-1 truncate flex items-center gap-1.5"
                      >
                        <Folder
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: folder.color || "#6366f1" }}
                          fill={folder.color || "#6366f1"}
                        />
                        <span className="text-slate-800">{folder.name}</span>
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">
                          ({folderGroups.length} grupo{folderGroups.length === 1 ? "" : "s"})
                        </span>
                      </Label>

                      {selectedCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary font-normal"
                        >
                          {selectedCount}/{folderGroupJids.length}
                        </Badge>
                      )}
                    </div>

                    {/* Folder Groups */}
                    {isExpanded && (
                      <div className="pl-6 pr-2 py-1 space-y-0.5 border-t border-slate-100 bg-white">
                        {folderGroups.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground italic py-1">
                            Nenhum grupo nesta pasta
                          </p>
                        ) : (
                          folderGroups.map((g) => {
                            const isSelected = g.groupJid
                              ? selectedGroupJids.includes(g.groupJid)
                              : false;
                            return (
                              <div
                                key={g.id}
                                className={`flex items-center gap-2 p-1.5 rounded transition-colors ${
                                  isSelected ? "bg-primary/5 font-medium" : "hover:bg-slate-50"
                                }`}
                              >
                                <Checkbox
                                  id={`group-${g.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleGroup(g.groupJid)}
                                />
                                <Label
                                  htmlFor={`group-${g.id}`}
                                  className="text-xs font-normal cursor-pointer flex-1 flex items-center justify-between truncate"
                                >
                                  <span className="truncate text-slate-700">{g.name}</span>
                                  {g.participantsCount > 0 && (
                                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                                      {g.participantsCount} membros
                                    </span>
                                  )}
                                </Label>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Groups Without Folder */}
              {noFolderGroups.length > 0 && (
                <div className="pt-1">
                  {folders.length > 0 && (
                    <div className="px-1.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <span>Sem pasta / Outros grupos</span>
                      <span className="text-muted-foreground font-normal">
                        ({noFolderGroups.length})
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {noFolderGroups.map((g) => {
                      const isSelected = g.groupJid
                        ? selectedGroupJids.includes(g.groupJid)
                        : false;
                      return (
                        <div
                          key={g.id}
                          className={`flex items-center gap-2 p-1.5 rounded transition-colors ${
                            isSelected ? "bg-primary/5 font-medium" : "hover:bg-slate-50"
                          }`}
                        >
                          <Checkbox
                            id={`group-${g.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleGroup(g.groupJid)}
                          />
                          <Label
                            htmlFor={`group-${g.id}`}
                            className="text-xs font-normal cursor-pointer flex-1 flex items-center justify-between truncate"
                          >
                            <span className="truncate text-slate-700">{g.name}</span>
                            {g.participantsCount > 0 && (
                              <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                                {g.participantsCount} membros
                              </span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
