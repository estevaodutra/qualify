import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FolderKanban, ChevronsUpDown, Check, X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PipelineItem, PipelineGroupItem } from "./PipelineSelect";

export interface MultiPipelineSelectProps {
  value?: string[];
  onValueChange: (value: string[]) => void;
  pipelines?: PipelineItem[];
  pipelineGroups?: PipelineGroupItem[];
  activeCompanyId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function MultiPipelineSelect({
  value = [],
  onValueChange,
  pipelines: propPipelines,
  pipelineGroups: propGroups,
  activeCompanyId: propCompanyId,
  placeholder = "Selecionar pipelines...",
  disabled = false,
  className,
  triggerClassName,
}: MultiPipelineSelectProps) {
  const { activeCompanyId: contextCompanyId } = useCompany();
  const effectiveCompanyId = propCompanyId || contextCompanyId;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const hasPropPipelines = Array.isArray(propPipelines) && propPipelines.length > 0;
  const hasPropGroups = Array.isArray(propGroups) && propGroups.length > 0;

  // Query pipelines
  const { data: fetchedPipelines, isLoading: loadingPipelines } = useQuery({
    queryKey: ["pipeline-select-pipelines", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("status", "active")
        .order("order_index", { ascending: true });
      if (error) {
        console.error("Erro ao carregar pipelines para seletor:", error);
        return [];
      }
      return data as PipelineItem[];
    },
    enabled: !hasPropPipelines && !!effectiveCompanyId,
  });

  // Query pipeline_groups
  const { data: fetchedGroups, isLoading: loadingGroups } = useQuery({
    queryKey: ["pipeline-select-groups", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("pipeline_groups")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .order("order_index", { ascending: true });
      if (error) {
        console.error("Erro ao carregar grupos de pipeline:", error);
        return [];
      }
      return data as PipelineGroupItem[];
    },
    enabled: !hasPropGroups && !!effectiveCompanyId,
  });

  const allPipelines = hasPropPipelines ? propPipelines! : (fetchedPipelines || []);
  const allGroups = hasPropGroups ? propGroups! : (fetchedGroups || []);

  const pipelineMap = useMemo(() => {
    const map = new Map<string, PipelineItem>();
    allPipelines.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPipelines]);

  const groupMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; order_index: number }>();
    allGroups.forEach((g) => {
      map.set(g.id, { id: g.id, name: g.name, order_index: g.order_index ?? 0 });
    });
    return map;
  }, [allGroups]);

  // Group and filter data
  const groupedData = useMemo(() => {
    const groups: Map<string, { id: string; name: string; order_index: number; items: PipelineItem[] }> = new Map();

    allGroups.forEach((g) => {
      groups.set(g.id, {
        id: g.id,
        name: g.name,
        order_index: g.order_index ?? 0,
        items: [],
      });
    });

    const noGroupItems: PipelineItem[] = [];
    const searchLower = search.trim().toLowerCase();

    allPipelines.forEach((pipe) => {
      if (searchLower && !pipe.name.toLowerCase().includes(searchLower)) {
        return;
      }

      const gId = pipe.group_id || pipe.pipeline_groups?.id;
      if (gId) {
        let group = groups.get(gId);
        if (!group) {
          const gName = pipe.pipeline_groups?.name || "Grupo";
          const gOrder = pipe.pipeline_groups?.order_index ?? 999;
          group = { id: gId, name: gName, order_index: gOrder, items: [] };
          groups.set(gId, group);
        }
        group.items.push(pipe);
      } else {
        noGroupItems.push(pipe);
      }
    });

    const sortedGroups = Array.from(groups.values())
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name));

    if (noGroupItems.length > 0) {
      sortedGroups.push({
        id: "no_group",
        name: "Outras Pipelines",
        order_index: 9999,
        items: noGroupItems,
      });
    }

    return sortedGroups;
  }, [allPipelines, allGroups, search]);

  const togglePipeline = (id: string) => {
    if (value.includes(id)) {
      onValueChange(value.filter((v) => v !== id));
    } else {
      onValueChange([...value, id]);
    }
  };

  const removePipeline = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onValueChange(value.filter((v) => v !== id));
  };

  const selectAll = () => {
    const allIds = allPipelines.map((p) => p.id);
    onValueChange(allIds);
  };

  const clearAll = () => {
    onValueChange([]);
  };

  const isLoading = (!hasPropPipelines && loadingPipelines) || (!hasPropGroups && loadingGroups);

  return (
    <div className={cn("w-full space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || isLoading}
            className={cn(
              "w-full justify-between text-left font-normal h-auto min-h-[36px] py-1.5 px-3 rounded-xl border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs",
              triggerClassName
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Carregando pipelines...</span>
              </div>
            ) : value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2 overflow-hidden">
                {value.map((pipeId) => {
                  const pipe = pipelineMap.get(pipeId);
                  const groupName = pipe?.group_id ? groupMap.get(pipe.group_id)?.name : null;
                  return (
                    <Badge
                      key={pipeId}
                      variant="secondary"
                      className="text-[11px] bg-purple-50 text-purple-900 border border-purple-200/70 hover:bg-purple-100/80 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 font-medium"
                    >
                      <span className="truncate max-w-[150px]">{pipe?.name || "Pipeline"}</span>
                      {groupName && (
                        <span className="text-[9px] text-purple-600/80 font-bold bg-white/70 px-1 rounded">
                          {groupName}
                        </span>
                      )}
                      <X
                        className="h-3 w-3 text-purple-500 hover:text-purple-800 cursor-pointer ml-0.5"
                        onClick={(e) => removePipeline(e, pipeId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1 opacity-70" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[340px] p-0 z-[10000] bg-white rounded-xl shadow-xl border border-slate-200" align="start">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pipeline..."
              className="h-7 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 bg-transparent"
            />
            {search && (
              <X
                className="h-3 w-3 text-slate-400 hover:text-slate-600 cursor-pointer mr-1"
                onClick={() => setSearch("")}
              />
            )}
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500">
            <span>{value.length} de {allPipelines.length} selecionadas</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-purple-600 hover:text-purple-800 font-semibold"
              >
                Todas
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-slate-500 hover:text-slate-700 font-medium"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-2">
            {groupedData.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Nenhuma pipeline encontrada
              </div>
            ) : (
              groupedData.map((group) => (
                <div key={group.id} className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50/70 rounded-md flex items-center justify-between sticky top-0 backdrop-blur z-10 border border-purple-200/50">
                    <span className="flex items-center gap-1.5 truncate">
                      <FolderKanban className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">{group.name}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-purple-600 bg-white/80 px-1.5 py-0.2 rounded border border-purple-200/40">
                      {group.items.length}
                    </span>
                  </div>

                  <div className="pl-1 space-y-0.5">
                    {group.items.map((pipe) => {
                      const isSelected = value.includes(pipe.id);
                      return (
                        <div
                          key={pipe.id}
                          onClick={() => togglePipeline(pipe.id)}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors select-none",
                            isSelected
                              ? "bg-purple-50/80 text-purple-900 font-semibold"
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePipeline(pipe.id)}
                            className="rounded h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                          <span className="truncate flex-1">{pipe.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
