import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { FolderKanban, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineItem {
  id: string;
  name: string;
  group_id?: string | null;
  pipeline_groups?: { id: string; name: string; order_index?: number } | null;
  status?: string;
  order_index?: number;
  [key: string]: any;
}

export interface PipelineGroupItem {
  id: string;
  name: string;
  order_index?: number;
}

export interface PipelineSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  pipelines?: PipelineItem[];
  pipelineGroups?: PipelineGroupItem[];
  activeCompanyId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function PipelineSelect({
  value,
  onValueChange,
  pipelines: propPipelines,
  pipelineGroups: propGroups,
  activeCompanyId: propCompanyId,
  placeholder = "Selecionar pipeline...",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
}: PipelineSelectProps) {
  const { activeCompanyId: contextCompanyId } = useCompany();
  const effectiveCompanyId = propCompanyId || contextCompanyId;

  // Fallback query for pipelines if not passed as props
  const { data: fetchedPipelines, isLoading: loadingPipelines } = useQuery({
    queryKey: ["pipeline-select-pipelines", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("pipelines")
        .select("id, name, status, group_id, order_index, pipeline_groups(id, name, order_index)")
        .eq("company_id", effectiveCompanyId)
        .eq("status", "active")
        .order("order_index", { ascending: true });
      if (error) {
        console.error("Erro ao carregar pipelines para seletor:", error);
        return [];
      }
      return data as PipelineItem[];
    },
    enabled: !propPipelines && !!effectiveCompanyId,
  });

  // Fallback query for pipeline_groups if not passed as props
  const { data: fetchedGroups } = useQuery({
    queryKey: ["pipeline-select-groups", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from("pipeline_groups")
        .select("id, name, order_index")
        .eq("company_id", effectiveCompanyId)
        .order("order_index", { ascending: true });
      if (error) {
        console.error("Erro ao carregar grupos de pipeline:", error);
        return [];
      }
      return data as PipelineGroupItem[];
    },
    enabled: !propGroups && !!effectiveCompanyId,
  });

  const allPipelines = propPipelines || fetchedPipelines || [];
  const allGroups = propGroups || fetchedGroups || [];

  // Group Map for fast lookups
  const groupMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; order_index: number }>();
    allGroups.forEach((g) => {
      map.set(g.id, { id: g.id, name: g.name, order_index: g.order_index ?? 0 });
    });
    return map;
  }, [allGroups]);

  // Grouped Pipelines structure
  const groupedData = useMemo(() => {
    const groups: Map<string, { id: string; name: string; order_index: number; items: PipelineItem[] }> = new Map();

    // Initialize groups from known pipeline_groups to preserve exact sorting
    allGroups.forEach((g) => {
      groups.set(g.id, {
        id: g.id,
        name: g.name,
        order_index: g.order_index ?? 0,
        items: [],
      });
    });

    const noGroupItems: PipelineItem[] = [];

    // Distribute pipelines into groups
    allPipelines.forEach((pipe) => {
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

    // Filter out groups with 0 pipelines and sort groups by order_index
    const sortedGroups = Array.from(groups.values())
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name));

    // Append "Sem grupo" / "Outras pipelines" at the end if any exist
    if (noGroupItems.length > 0) {
      sortedGroups.push({
        id: "no_group",
        name: "Outras Pipelines",
        order_index: 9999,
        items: noGroupItems,
      });
    }

    return sortedGroups;
  }, [allPipelines, allGroups]);

  // Selected pipeline and its group name for the trigger badge
  const selectedPipeline = useMemo(() => {
    return allPipelines.find((p) => p.id === value);
  }, [allPipelines, value]);

  const selectedGroupName = useMemo(() => {
    if (!selectedPipeline) return null;
    if (selectedPipeline.pipeline_groups?.name) return selectedPipeline.pipeline_groups.name;
    if (selectedPipeline.group_id && groupMap.has(selectedPipeline.group_id)) {
      return groupMap.get(selectedPipeline.group_id)?.name;
    }
    return null;
  }, [selectedPipeline, groupMap]);

  const isLoading = !propPipelines && loadingPipelines;

  return (
    <div className={cn("w-full", className)}>
      <Select value={value || ""} onValueChange={onValueChange} disabled={disabled || isLoading}>
        <SelectTrigger className={cn("rounded-xl border-slate-200 text-xs w-full bg-white", triggerClassName)}>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Carregando pipelines...</span>
            </div>
          ) : selectedPipeline ? (
            <div className="flex items-center justify-between gap-2 w-full pr-1 overflow-hidden">
              <span className="truncate font-semibold text-slate-800 text-left">
                {selectedPipeline.name}
              </span>
              {selectedGroupName && (
                <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60 shrink-0 font-bold max-w-[130px] truncate">
                  {selectedGroupName}
                </span>
              )}
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>

        <SelectContent className={cn("max-h-80 overflow-y-auto", contentClassName)}>
          {groupedData.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Nenhuma pipeline encontrada
            </div>
          ) : (
            groupedData.map((group, groupIndex) => (
              <React.Fragment key={group.id}>
                {groupIndex > 0 && <SelectSeparator className="my-1.5 opacity-60" />}
                <SelectGroup>
                  <SelectLabel className="px-2.5 py-1.5 text-[11px] font-bold tracking-wider uppercase text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/40 rounded-md my-1 border border-purple-200/50 sticky top-0 z-10 backdrop-blur select-none flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <FolderKanban className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">{group.name}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-purple-600/80 bg-white/80 dark:bg-purple-900/60 px-1.5 py-0.5 rounded border border-purple-200/40 shrink-0 ml-2">
                      {group.items.length}
                    </span>
                  </SelectLabel>
                  {group.items.map((pipe) => (
                    <SelectItem
                      key={pipe.id}
                      value={pipe.id}
                      className="text-xs pl-7 py-1.5 cursor-pointer font-medium hover:bg-purple-50/50"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{pipe.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </React.Fragment>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
