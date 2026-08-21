import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { X, RotateCcw } from "lucide-react";
import { AdvancedChatFilters, DEFAULT_ADVANCED_CHAT_FILTERS } from "@/types/chatFilterTypes";

interface ActiveFilterChipsProps {
  filters: AdvancedChatFilters;
  onUpdateFilters: (filters: AdvancedChatFilters) => void;
  operators?: Array<{ id: string; name: string }>;
  instances?: Array<{ id: string; name: string }>;
  pipelines?: Array<{ id: string; name: string }>;
  stages?: Array<{ id: string; name: string }>;
  tags?: Array<string | { id: string; name: string; name_or_tag?: string }>;
}

export default function ActiveFilterChips({
  filters,
  onUpdateFilters,
  operators = [],
  instances = [],
  pipelines = [],
  stages = [],
  tags = [],
}: ActiveFilterChipsProps) {
  // Generate individual removable chips
  const chips = useMemo(() => {
    const list: Array<{ id: string; label: string; remove: () => void }> = [];

    // 1. Statuses
    if (filters.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach(status => {
        const labels: Record<string, string> = {
          open: "Aberto",
          in_progress: "Em Atendimento",
          waiting: "Espera",
          resolved: "Resolvido",
          unread: "Não Lidas",
          unassigned: "Sem Atribuição"
        };
        list.push({
          id: `status-${status}`,
          label: `Status: ${labels[status] || status}`,
          remove: () => {
            const next = (filters.statuses || []).filter(s => s !== status);
            onUpdateFilters({ ...filters, statuses: next });
          }
        });
      });
    }

    // 2. Operators
    if (filters.operatorIds && filters.operatorIds.length > 0) {
      filters.operatorIds.forEach(opId => {
        let opName = "Operador";
        if (opId === "unassigned") opName = "Sem atendente";
        else if (opId === "has_operator") opName = "Possui atendente";
        else {
          const found = operators.find(o => o.id === opId);
          if (found) opName = found.name;
        }
        list.push({
          id: `operator-${opId}`,
          label: `Atendente: ${opName}`,
          remove: () => {
            const next = (filters.operatorIds || []).filter(o => o !== opId);
            onUpdateFilters({ ...filters, operatorIds: next });
          }
        });
      });
    }

    // 3. Instances
    if (filters.instanceIds && filters.instanceIds.length > 0) {
      filters.instanceIds.forEach(instId => {
        const found = instances.find(i => i.id === instId);
        list.push({
          id: `instance-${instId}`,
          label: `Conexão: ${found?.name || "Instância"}`,
          remove: () => {
            const next = (filters.instanceIds || []).filter(i => i !== instId);
            onUpdateFilters({ ...filters, instanceIds: next });
          }
        });
      });
    }

    // 4. Tags
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tagName => {
        list.push({
          id: `tag-${tagName}`,
          label: `Tag: ${tagName}`,
          remove: () => {
            const next = (filters.tags || []).filter(t => t !== tagName);
            onUpdateFilters({ ...filters, tags: next });
          }
        });
      });
    }

    if (filters.tagPresence === "has_tags") {
      list.push({
        id: "tag-presence-has",
        label: "Possui alguma tag",
        remove: () => onUpdateFilters({ ...filters, tagPresence: "any" })
      });
    } else if (filters.tagPresence === "no_tags") {
      list.push({
        id: "tag-presence-none",
        label: "Sem tags",
        remove: () => onUpdateFilters({ ...filters, tagPresence: "any" })
      });
    }

    // 5. Pipeline & Stages
    if (filters.pipelineId) {
      const foundPipe = pipelines.find(p => p.id === filters.pipelineId);
      list.push({
        id: `pipeline-${filters.pipelineId}`,
        label: `Pipeline: ${foundPipe?.name || "Pipeline"}`,
        remove: () => onUpdateFilters({ ...filters, pipelineId: null, stageIds: [] })
      });
    }

    if (filters.stageIds && filters.stageIds.length > 0) {
      filters.stageIds.forEach(stId => {
        const foundStage = stages.find(s => s.id === stId);
        list.push({
          id: `stage-${stId}`,
          label: `Etapa: ${foundStage?.name || "Etapa"}`,
          remove: () => {
            const next = (filters.stageIds || []).filter(s => s !== stId);
            onUpdateFilters({ ...filters, stageIds: next });
          }
        });
      });
    }

    // 6. Deals
    if (filters.dealPresence === "has_deal") {
      list.push({
        id: "deal-has",
        label: "Possui negócio",
        remove: () => onUpdateFilters({ ...filters, dealPresence: "all" })
      });
    } else if (filters.dealPresence === "no_deal") {
      list.push({
        id: "deal-none",
        label: "Sem negócio",
        remove: () => onUpdateFilters({ ...filters, dealPresence: "all" })
      });
    }

    if (filters.dealStatus && filters.dealStatus !== "all") {
      const dealLabels: Record<string, string> = { open: "Aberto", won: "Ganho", lost: "Perdido" };
      list.push({
        id: `deal-status-${filters.dealStatus}`,
        label: `Negócio: ${dealLabels[filters.dealStatus] || filters.dealStatus}`,
        remove: () => onUpdateFilters({ ...filters, dealStatus: "all" })
      });
    }

    // 7. Dates
    if (filters.leadCreatedAtPreset) {
      list.push({
        id: "date-lead",
        label: `Lead criado: ${filters.leadCreatedAtPreset}`,
        remove: () => onUpdateFilters({ ...filters, leadCreatedAtPreset: undefined, leadCreatedAtRange: undefined })
      });
    }

    if (filters.conversationCreatedAtPreset) {
      list.push({
        id: "date-conv",
        label: `Conversa criada: ${filters.conversationCreatedAtPreset}`,
        remove: () => onUpdateFilters({ ...filters, conversationCreatedAtPreset: undefined, conversationCreatedAtRange: undefined })
      });
    }

    if (filters.lastMessageAtPreset) {
      list.push({
        id: "date-msg",
        label: `Msg: ${filters.lastMessageAtPreset}`,
        remove: () => onUpdateFilters({ ...filters, lastMessageAtPreset: undefined, lastMessageAtRange: undefined })
      });
    }

    // 8. Unread & Archive
    if (filters.unreadMode === "unread_only") {
      list.push({
        id: "unread-only",
        label: "Somente não lidas",
        remove: () => onUpdateFilters({ ...filters, unreadMode: "all" })
      });
    } else if (filters.unreadMode === "read_only") {
      list.push({
        id: "read-only",
        label: "Somente lidas",
        remove: () => onUpdateFilters({ ...filters, unreadMode: "all" })
      });
    }

    if (filters.archiveMode === "archived_only") {
      list.push({
        id: "archived-only",
        label: "Somente arquivadas",
        remove: () => onUpdateFilters({ ...filters, archiveMode: "active_only" })
      });
    }

    return list;
  }, [filters, operators, instances, pipelines, stages, onUpdateFilters]);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-2 pb-1">
      {chips.map(chip => (
        <Badge
          key={chip.id}
          variant="secondary"
          className="text-[10px] h-6 px-2 font-medium rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.remove}
            className="hover:text-destructive hover:bg-destructive/10 p-0.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <button
        type="button"
        onClick={() => onUpdateFilters(DEFAULT_ADVANCED_CHAT_FILTERS)}
        className="text-[10px] font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-destructive/10 transition-colors ml-auto cursor-pointer"
        title="Limpar todos os filtros"
      >
        <RotateCcw className="h-2.5 w-2.5" /> Limpar tudo
      </button>
    </div>
  );
}
