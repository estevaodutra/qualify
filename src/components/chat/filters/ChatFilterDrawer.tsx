import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AdvancedChatFilters,
  DEFAULT_ADVANCED_CHAT_FILTERS,
  SavedChatFilter,
  DatePreset,
  ConversationStatusFilter
} from "@/types/chatFilterTypes";
import { useSavedChatFilters } from "@/hooks/useSavedChatFilters";
import SaveChatFilterModal from "./SaveChatFilterModal";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Filter, Bookmark, Sparkles, RotateCcw, Check, Trash2, Edit2, Plus,
  ChevronRight, AlertTriangle, Layers, Calendar, User, Tag as TagIcon, Kanban, Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ChatFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appliedFilters: AdvancedChatFilters;
  onApplyFilters: (filters: AdvancedChatFilters) => void;
  operators?: Array<{ id: string; name: string }>;
  instances?: Array<{ id: string; name: string; phoneNumber?: string; status: string }>;
}

export default function ChatFilterDrawer({
  open,
  onOpenChange,
  appliedFilters,
  onApplyFilters,
  operators = [],
  instances = [],
}: ChatFilterDrawerProps) {
  const { activeCompanyId } = useCompany();
  const { savedFilters, saveFilter, updateFilter, renameFilter, deleteFilter, markFilterUsed } = useSavedChatFilters();

  // Local draft state for filters inside drawer
  const [draftFilters, setDraftFilters] = useState<AdvancedChatFilters>(appliedFilters);
  const [activeSavedFilter, setActiveSavedFilter] = useState<SavedChatFilter | null>(null);

  // Modals state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  // Sync draft state with applied filters when drawer opens
  useEffect(() => {
    if (open) {
      setDraftFilters(appliedFilters);
    }
  }, [open, appliedFilters]);

  // Fetch Company Pipelines
  const { data: pipelines = [] } = useQuery({
    queryKey: ["filter-pipelines", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("pipelines")
        .select("id, name, color")
        .eq("company_id", activeCompanyId)
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId && open,
  });

  // Fetch Stages for selected Pipeline
  const { data: stages = [] } = useQuery({
    queryKey: ["filter-stages", draftFilters.pipelineId],
    queryFn: async () => {
      if (!draftFilters.pipelineId) return [];
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, name, color, order_index")
        .eq("pipeline_id", draftFilters.pipelineId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!draftFilters.pipelineId && open,
  });

  // Fetch Company Tags
  const { data: companyTags = [] } = useQuery({
    queryKey: ["filter-tags", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color")
        .eq("company_id", activeCompanyId)
        .order("name", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!activeCompanyId && open,
  });

  // Check if draft has unsaved changes compared to activeSavedFilter
  const hasUnsavedSavedFilterChanges = useMemo(() => {
    if (!activeSavedFilter) return false;
    return JSON.stringify(draftFilters) !== JSON.stringify(activeSavedFilter.filters_json);
  }, [draftFilters, activeSavedFilter]);

  // Handle Saved Filter Application
  const handleSelectSavedFilter = async (filter: SavedChatFilter) => {
    setActiveSavedFilter(filter);
    setDraftFilters(filter.filters_json);
    onApplyFilters(filter.filters_json);
    await markFilterUsed(filter.id);
  };

  // Helper toggle multi-select values
  const toggleArrayValue = <T,>(arr: T[] | undefined, value: T): T[] => {
    const list = arr || [];
    if (list.includes(value)) {
      return list.filter(item => item !== value);
    }
    return [...list, value];
  };

  const handleApply = () => {
    onApplyFilters(draftFilters);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    const cleared = { ...DEFAULT_ADVANCED_CHAT_FILTERS, search: draftFilters.search };
    setDraftFilters(cleared);
    setActiveSavedFilter(null);
    onApplyFilters(cleared);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-card/95 backdrop-blur-2xl border-l border-border/60 shadow-2xl z-[9990] overflow-hidden">
        {/* Header */}
        <SheetHeader className="p-5 border-b border-border/40 bg-card/40 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" /> Filtros Avançados
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Combine múltiplas condições em camada para refinar suas conversas.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Saved Filters Bar */}
          <div className="p-3 bg-muted/20 border border-border/40 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Bookmark className="h-3.5 w-3.5 text-primary" /> Filtros Salvos
              </span>
              {activeSavedFilter && (
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-xs z-[10000]">
                      <DropdownMenuItem onClick={() => updateFilter({ id: activeSavedFilter.id, filters: draftFilters })}>
                        Atualizar Filtro Salvo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSaveModalOpen(true)}>
                        Salvar como Novo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRenameModalOpen(true)}>
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteFilter(activeSavedFilter.id)} className="text-destructive">
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {savedFilters.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60 italic">
                Nenhuma predefinição salva. Configure as opções abaixo e clique em "Salvar Filtro".
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {savedFilters.map((sf) => {
                  const isActive = activeSavedFilter?.id === sf.id;
                  return (
                    <button
                      key={sf.id}
                      type="button"
                      onClick={() => handleSelectSavedFilter(sf)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 cursor-pointer border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold"
                          : "bg-background/80 hover:bg-muted border-border/50 text-foreground"
                      )}
                    >
                      {isActive && <Check className="h-3 w-3" />}
                      <span>{sf.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {hasUnsavedSavedFilterChanges && (
              <div className="flex items-center justify-between text-[10px] text-amber-500 font-semibold bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 mt-1">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Alterações não salvas na predefinição
                </span>
                <button
                  type="button"
                  onClick={() => updateFilter({ id: activeSavedFilter!.id, filters: draftFilters })}
                  className="underline hover:text-amber-400 cursor-pointer"
                >
                  Atualizar
                </button>
              </div>
            )}
          </div>

          {/* Accordion Categories */}
          <Accordion type="multiple" defaultValue={["status", "operators", "instances"]} className="space-y-3">
            {/* 1. Status da Conversa */}
            <AccordionItem value="status" className="border border-border/40 rounded-2xl px-3 bg-card/20">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Status da Conversa</span>
                  {draftFilters.statuses && draftFilters.statuses.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                      {draftFilters.statuses.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1 pb-3 text-xs">
                {[
                  { id: "open", label: "Aberto" },
                  { id: "in_progress", label: "Em Atendimento" },
                  { id: "waiting", label: "Espera / Aguardando" },
                  { id: "resolved", label: "Resolvido" },
                  { id: "unread", label: "Não Lidas" },
                  { id: "unassigned", label: "Sem Atribuição" },
                ].map((st) => {
                  const isChecked = (draftFilters.statuses || []).includes(st.id as ConversationStatusFilter);
                  return (
                    <label key={st.id} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => {
                          const next = toggleArrayValue(draftFilters.statuses, st.id as ConversationStatusFilter);
                          setDraftFilters({ ...draftFilters, statuses: next });
                        }}
                      />
                      <span>{st.label}</span>
                    </label>
                  );
                })}
              </AccordionContent>
            </AccordionItem>

            {/* 2. Operadores / Atendentes */}
            <AccordionItem value="operators" className="border border-border/40 rounded-2xl px-3 bg-card/20">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Atendentes / Operadores</span>
                  {draftFilters.operatorIds && draftFilters.operatorIds.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                      {draftFilters.operatorIds.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1 pb-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                  <Checkbox
                    checked={(draftFilters.operatorIds || []).includes("unassigned")}
                    onCheckedChange={() => {
                      const next = toggleArrayValue(draftFilters.operatorIds, "unassigned");
                      setDraftFilters({ ...draftFilters, operatorIds: next });
                    }}
                  />
                  <span className="italic text-muted-foreground">Sem atendente (Não atribuído)</span>
                </label>

                {operators.map((op) => {
                  const isChecked = (draftFilters.operatorIds || []).includes(op.id);
                  return (
                    <label key={op.id} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => {
                          const next = toggleArrayValue(draftFilters.operatorIds, op.id);
                          setDraftFilters({ ...draftFilters, operatorIds: next });
                        }}
                      />
                      <span>{op.name}</span>
                    </label>
                  );
                })}
              </AccordionContent>
            </AccordionItem>

            {/* 3. Conexões / Instâncias */}
            <AccordionItem value="instances" className="border border-border/40 rounded-2xl px-3 bg-card/20">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary" />
                  <span>Conexões / Instâncias</span>
                  {draftFilters.instanceIds && draftFilters.instanceIds.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                      {draftFilters.instanceIds.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-1 pb-3 text-xs">
                {instances.length === 0 ? (
                  <p className="text-muted-foreground/60 italic">Nenhuma conexão cadastrada</p>
                ) : (
                  instances.map((inst) => {
                    const isChecked = (draftFilters.instanceIds || []).includes(inst.id);
                    return (
                      <label key={inst.id} className="flex items-center justify-between cursor-pointer hover:text-primary transition-colors">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {
                              const next = toggleArrayValue(draftFilters.instanceIds, inst.id);
                              setDraftFilters({ ...draftFilters, instanceIds: next });
                            }}
                          />
                          <span>{inst.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {inst.status === "connected" ? "🟢 Conectado" : "⚪ Desconectado"}
                        </span>
                      </label>
                    );
                  })
                )}
              </AccordionContent>
            </AccordionItem>

            {/* 4. Tags */}
            <AccordionItem value="tags" className="border border-border/40 rounded-2xl px-3 bg-card/20">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-primary" />
                  <span>Tags</span>
                  {draftFilters.tags && draftFilters.tags.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                      {draftFilters.tags.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-3 text-xs">
                {/* Tag Mode Selector: ANY vs ALL */}
                <div className="flex bg-muted/40 p-0.5 rounded-xl border border-border/30">
                  <button
                    type="button"
                    onClick={() => setDraftFilters({ ...draftFilters, tagMode: "any" })}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all",
                      draftFilters.tagMode === "any" || !draftFilters.tagMode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    )}
                  >
                    Qualquer uma (OR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftFilters({ ...draftFilters, tagMode: "all" })}
                    className={cn(
                      "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all",
                      draftFilters.tagMode === "all"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    )}
                  >
                    Todas (AND)
                  </button>
                </div>

                {/* Tag Presence Filter */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={draftFilters.tagPresence === "has_tags"}
                      onCheckedChange={(chk) =>
                        setDraftFilters({ ...draftFilters, tagPresence: chk ? "has_tags" : "any" })
                      }
                    />
                    <span>Possui alguma tag</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={draftFilters.tagPresence === "no_tags"}
                      onCheckedChange={(chk) =>
                        setDraftFilters({ ...draftFilters, tagPresence: chk ? "no_tags" : "any" })
                      }
                    />
                    <span>Sem tags</span>
                  </label>
                </div>

                {/* Company Tags Checkboxes */}
                <div className="space-y-1.5 pt-1 max-h-40 overflow-y-auto pr-1">
                  {companyTags.length === 0 ? (
                    <p className="text-muted-foreground/60 italic">Nenhuma tag encontrada</p>
                  ) : (
                    companyTags.map((tagObj: any) => {
                      const tagName = typeof tagObj === "string" ? tagObj : tagObj.name;
                      const isChecked = (draftFilters.tags || []).includes(tagName);
                      return (
                        <label key={tagName} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {
                              const next = toggleArrayValue(draftFilters.tags, tagName);
                              setDraftFilters({ ...draftFilters, tags: next });
                            }}
                          />
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: tagObj.color || "#3b82f6" }}
                          />
                          <span>{tagName}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. Pipeline & Etapa */}
            <AccordionItem value="pipeline" className="border border-border/40 rounded-2xl px-3 bg-card/20">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Kanban className="h-4 w-4 text-primary" />
                  <span>Pipeline & Etapas</span>
                  {draftFilters.pipelineId && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                      Ativo
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-3 text-xs">
                {/* Pipeline Select */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Pipeline</Label>
                  <Select
                    value={draftFilters.pipelineId || "none"}
                    onValueChange={(val) =>
                      setDraftFilters({
                        ...draftFilters,
                        pipelineId: val === "none" ? null : val,
                        stageIds: [],
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue placeholder="Todas as pipelines" />
                    </SelectTrigger>
                    <SelectContent className="text-xs z-[10000]">
                      <SelectItem value="none">Todas as pipelines</SelectItem>
                      {pipelines.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stages Multi-select (Only if pipeline selected) */}
                {draftFilters.pipelineId && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Etapas da Pipeline</Label>
                    {stages.length === 0 ? (
                      <p className="text-muted-foreground/60 italic">Nenhuma etapa nesta pipeline</p>
                    ) : (
                      stages.map((st) => {
                        const isChecked = (draftFilters.stageIds || []).includes(st.id);
                        return (
                          <label key={st.id} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => {
                                const next = toggleArrayValue(draftFilters.stageIds, st.id);
                                setDraftFilters({ ...draftFilters, stageIds: next });
                              }}
                            />
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: st.color || "#3b82f6" }}
                            />
                            <span>{st.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* 6. Negócios CRM */}
            <AccordionItem value="deals" className="border border-border/40 rounded-2xl px-3 bg-card/20">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Negócio / Oportunidade</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Vínculo com Negócio</Label>
                  <Select
                    value={draftFilters.dealPresence || "all"}
                    onValueChange={(val: any) => setDraftFilters({ ...draftFilters, dealPresence: val })}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="text-xs z-[10000]">
                      <SelectItem value="all">Todos os leads</SelectItem>
                      <SelectItem value="has_deal">Possui negócio no CRM</SelectItem>
                      <SelectItem value="no_deal">Não possui negócio no CRM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {draftFilters.dealPresence === "has_deal" && (
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Status do Negócio</Label>
                    <Select
                      value={draftFilters.dealStatus || "all"}
                      onValueChange={(val: any) => setDraftFilters({ ...draftFilters, dealStatus: val })}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-xl">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent className="text-xs z-[10000]">
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="open">Aberto (Em andamento)</SelectItem>
                        <SelectItem value="won">Ganho (Fechado)</SelectItem>
                        <SelectItem value="lost">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* 7. Datas */}
            <AccordionItem value="dates" className="border border-border/40 rounded-2xl px-3 bg-card/20">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Filtro de Datas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-3 text-xs">
                {/* Data da Última Mensagem */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Data da Última Mensagem</Label>
                  <Select
                    value={draftFilters.lastMessageAtPreset || "all"}
                    onValueChange={(val: any) =>
                      setDraftFilters({ ...draftFilters, lastMessageAtPreset: val === "all" ? undefined : val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue placeholder="Qualquer data" />
                    </SelectTrigger>
                    <SelectContent className="text-xs z-[10000]">
                      <SelectItem value="all">Qualquer data</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="last_24h">Últimas 24 horas</SelectItem>
                      <SelectItem value="last_3d">Últimos 3 dias</SelectItem>
                      <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                      <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                      <SelectItem value="more_than_7d">Mais de 7 dias atrás</SelectItem>
                      <SelectItem value="more_than_30d">Mais de 30 dias atrás</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Data de Criação do Lead */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Data de Cadastro do Lead</Label>
                  <Select
                    value={draftFilters.leadCreatedAtPreset || "all"}
                    onValueChange={(val: any) =>
                      setDraftFilters({ ...draftFilters, leadCreatedAtPreset: val === "all" ? undefined : val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue placeholder="Qualquer data" />
                    </SelectTrigger>
                    <SelectContent className="text-xs z-[10000]">
                      <SelectItem value="all">Qualquer data</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="yesterday">Ontem</SelectItem>
                      <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                      <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                      <SelectItem value="this_month">Este mês</SelectItem>
                      <SelectItem value="last_month">Mês passado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 8. Ordenação */}
            <AccordionItem value="sort" className="border border-border/40 rounded-2xl px-3 bg-card/20">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <span>Ordenação</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-3 text-xs">
                <Select
                  value={draftFilters.sortBy || "last_message_desc"}
                  onValueChange={(val: any) => setDraftFilters({ ...draftFilters, sortBy: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Mais recentes" />
                  </SelectTrigger>
                  <SelectContent className="text-xs z-[10000]">
                    <SelectItem value="last_message_desc">Última mensagem mais recente</SelectItem>
                    <SelectItem value="last_message_asc">Última mensagem mais antiga</SelectItem>
                    <SelectItem value="created_desc">Conversa mais recente</SelectItem>
                    <SelectItem value="created_asc">Conversa mais antiga</SelectItem>
                    <SelectItem value="name_asc">Nome A-Z</SelectItem>
                    <SelectItem value="name_desc">Nome Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Footer Actions */}
        <SheetFooter className="p-4 border-t border-border/40 bg-card/60 flex items-center justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearAll}
            className="rounded-xl text-xs text-muted-foreground hover:text-destructive gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveModalOpen(true)}
              className="rounded-xl text-xs font-semibold gap-1"
            >
              <Bookmark className="h-3.5 w-3.5 text-primary" /> Salvar
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/20 gap-1"
            >
              <Check className="h-4 w-4" /> Aplicar filtros
            </Button>
          </div>
        </SheetFooter>

        {/* Child Save / Rename Modal */}
        <SaveChatFilterModal
          open={saveModalOpen}
          onOpenChange={setSaveModalOpen}
          onSave={async (name) => {
            await saveFilter({ name, filters: draftFilters });
          }}
        />

        <SaveChatFilterModal
          open={renameModalOpen}
          onOpenChange={setRenameModalOpen}
          initialName={activeSavedFilter?.name}
          onSave={async (name) => {
            if (activeSavedFilter) {
              await renameFilter({ id: activeSavedFilter.id, name });
              setActiveSavedFilter({ ...activeSavedFilter, name });
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
