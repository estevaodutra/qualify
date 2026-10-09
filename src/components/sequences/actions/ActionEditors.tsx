import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, AlertTriangle, Info, Search, X, Check, ChevronsUpDown, Tag as TagIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ActionDefinition } from "./actionRegistry";
import { VariablePicker } from "../VariablePicker";

interface CompanyTag {
  id?: string;
  name: string;
  color?: string;
}

const LOCAL_TAGS_KEY = (companyId: string) => `qualify_tags_${companyId}`;

function getLocalTags(companyId: string): CompanyTag[] {
  try {
    const raw = localStorage.getItem(LOCAL_TAGS_KEY(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTag(companyId: string, tag: { name: string; color?: string }): CompanyTag {
  try {
    const raw = localStorage.getItem(LOCAL_TAGS_KEY(companyId));
    const existing: CompanyTag[] = raw ? JSON.parse(raw) : [];
    const newTag: CompanyTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: tag.name.trim(),
      color: tag.color || "#8A3CFF",
    };
    const updated = [...existing.filter((t) => t.name?.toLowerCase() !== newTag.name.toLowerCase()), newTag];
    localStorage.setItem(LOCAL_TAGS_KEY(companyId), JSON.stringify(updated));
    return newTag;
  } catch (e) {
    console.warn("Could not save tag locally", e);
    return { id: `tag_${Date.now()}`, name: tag.name.trim(), color: tag.color || "#8A3CFF" };
  }
}

interface ActionEditorsProps {
  actionDef: ActionDefinition;
  config: Record<string, unknown>;
  onChangeConfig: (newConfig: Record<string, unknown>) => void;
  activeCompanyId?: string;
  customFieldsMetadata: any[];
}

export const ActionEditors: React.FC<ActionEditorsProps> = ({
  actionDef,
  config,
  onChangeConfig,
  activeCompanyId,
  customFieldsMetadata,
}) => {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<CompanyTag[]>([]);
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    const loadResources = async () => {
      if (!activeCompanyId) return;
      try {
        // Pipelines
        const { data: pData } = await supabase
          .from("pipelines")
          .select("id, name, status")
          .eq("company_id", activeCompanyId)
          .eq("status", "active")
          .order("order_index", { ascending: true });
        if (pData) setPipelines(pData);

        // Pipeline Stages
        const { data: sData } = await supabase
          .from("pipeline_stages")
          .select("id, pipeline_id, name, order_index")
          .order("order_index", { ascending: true });
        if (sData) setPipelineStages(sData);

        // Tags - sincronizado com a tabela tags da empresa e o cache local oficial
        let dbTags: CompanyTag[] = [];
        try {
          const { data: tData, error: tErr } = await supabase
            .from("tags")
            .select("id, name, color")
            .eq("company_id", activeCompanyId)
            .order("name", { ascending: true });
          if (!tErr && tData) {
            dbTags = tData as CompanyTag[];
          }
        } catch (err) {
          console.warn("Erro ao buscar tags da tabela:", err);
        }

        const localTags = getLocalTags(activeCompanyId);
        const mergedMap = new Map<string, CompanyTag>();
        dbTags.forEach((t) => {
          if (t?.name) mergedMap.set(t.name.trim().toLowerCase(), t);
        });
        localTags.forEach((t) => {
          if (t?.name && !mergedMap.has(t.name.trim().toLowerCase())) {
            mergedMap.set(t.name.trim().toLowerCase(), t);
          }
        });

        setAvailableTags(Array.from(mergedMap.values()));

        // Company Members (Attendants)
        const { data: membersData } = await supabase
          .from("company_members")
          .select("id, user_id, role, profiles(id, full_name, email)")
          .eq("company_id", activeCompanyId)
          .eq("is_active", true);
        if (membersData) {
          const formatted = membersData.map((m: any) => ({
            id: m.user_id || m.id,
            name: m.profiles?.full_name || m.profiles?.email || "Usuário " + m.id.substring(0, 6),
          }));
          setCompanyMembers(formatted);
        }
      } catch (err) {
        console.error("Erro ao carregar recursos para editor de ação:", err);
      }
    };

    loadResources();
  }, [activeCompanyId]);

  const updateParam = (key: string, value: any) => {
    onChangeConfig({
      ...config,
      parameters: {
        ...((config.parameters as Record<string, unknown>) || {}),
        [key]: value,
      },
    });
  };

  const parameters = (config.parameters as Record<string, unknown>) || {};

  const renderFields = () => {
    switch (actionDef.type) {
      // ================= LEADS =================
      case "create_lead": {
        return (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-xs">
            <p className="text-slate-600 leading-relaxed font-medium">
              Cria o lead com as informações guardadas nos parâmetros da sessão. Caso o lead já existir, não será criado um novo lead.
            </p>
          </div>
        );
      }

      case "delete_lead": {
        const confirmed = !!parameters.confirmed;
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-2 text-xs text-rose-800">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>⚠ AÇÃO DESTRUTIVA</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700/90">
                Este bloco removerá o lead relacionado à execução do banco de dados quando for executado.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="confirm-delete-lead"
                checked={confirmed}
                onCheckedChange={(checked) => updateParam("confirmed", !!checked)}
              />
              <label htmlFor="confirm-delete-lead" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Estou ciente e confirmo a exclusão do lead durante a execução
              </label>
            </div>

            {!confirmed && (
              <div className="flex items-center gap-1.5 text-amber-600 text-[11px]">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Marque a confirmação obrigatória para ativar este bloco.</span>
              </div>
            )}
          </div>
        );
      }

      case "create_tag": {
        const tagName = (parameters.tagName as string) || "";
        const color = (parameters.color as string) || "#8A3CFF";
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome da Tag</Label>
              <Input
                value={tagName}
                onChange={(e) => updateParam("tagName", e.target.value)}
                placeholder="Ex: Cliente VIP"
                className="h-8 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Cor da Tag</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => updateParam("color", e.target.value)}
                  className="h-8 w-12 p-0 border border-slate-200 rounded-lg cursor-pointer bg-white"
                />
                <Input
                  value={color}
                  onChange={(e) => updateParam("color", e.target.value)}
                  className="h-8 rounded-xl text-xs font-mono w-28"
                />
              </div>
            </div>
          </div>
        );
      }

      case "add_lead_tags":
      case "remove_lead_tags": {
        const selectedTags = (parameters.tags as string[]) || [];
        const isAdd = actionDef.type === "add_lead_tags";

        const toggleTag = (tagName: string) => {
          const exists = selectedTags.some(
            (t) => t.toLowerCase() === tagName.toLowerCase()
          );
          const updated = exists
            ? selectedTags.filter((t) => t.toLowerCase() !== tagName.toLowerCase())
            : [...selectedTags, tagName];
          updateParam("tags", updated);
        };

        const removeTag = (tagName: string) => {
          const updated = selectedTags.filter(
            (t) => t.toLowerCase() !== tagName.toLowerCase()
          );
          updateParam("tags", updated);
        };

        const handleCreateAndAdd = async () => {
          const trimmed = tagSearch.trim();
          if (!trimmed) return;

          // Adiciona aos selecionados se ainda não estiver
          if (!selectedTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
            updateParam("tags", [...selectedTags, trimmed]);
          }

          // Se a tag ainda não existir no cadastro, cadastra localmente e no banco
          const existsInAvailable = availableTags.some(
            (t) => t.name.toLowerCase() === trimmed.toLowerCase()
          );

          if (!existsInAvailable && activeCompanyId) {
            const newTag = saveLocalTag(activeCompanyId, {
              name: trimmed,
              color: "#8A3CFF",
            });
            setAvailableTags((prev) => [...prev, newTag]);

            try {
              await supabase.from("tags").insert({
                company_id: activeCompanyId,
                name: trimmed,
                color: "#8A3CFF",
              });
            } catch (err) {
              console.warn("Falha ao persistir tag no banco:", err);
            }
          }

          setTagSearch("");
        };

        const filteredTags = availableTags.filter((t) =>
          t.name.toLowerCase().includes(tagSearch.toLowerCase().trim())
        );

        const exactMatch = availableTags.some(
          (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()
        );

        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Tags a {isAdd ? "adicionar" : "remover"}
              </Label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAdd
                  ? "Selecione as tags que serão aplicadas ao lead."
                  : "Selecione as tags que serão removidas do lead."}
              </p>
            </div>

            {/* Menu Suspenso (Dropdown) com Campo de Pesquisa */}
            <Popover open={tagDropdownOpen} onOpenChange={setTagDropdownOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all bg-white text-left",
                    "border-slate-200 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-2xs cursor-pointer",
                    tagDropdownOpen && "border-purple-500 ring-2 ring-purple-500/20"
                  )}
                >
                  <div className="flex items-center gap-2 text-slate-600 truncate min-w-0">
                    <TagIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className={selectedTags.length === 0 ? "text-slate-400" : "font-medium text-slate-700 truncate"}>
                      {selectedTags.length === 0
                        ? "Clique para buscar e selecionar tags..."
                        : `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selecionada${selectedTags.length > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                sideOffset={4}
                className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-2 rounded-2xl border border-slate-200 bg-white shadow-xl space-y-2 z-[9999]"
              >
                {/* Barrinha de Pesquisa */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Pesquisar tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagSearch.trim() && isAdd) {
                        e.preventDefault();
                        handleCreateAndAdd();
                      }
                    }}
                    autoFocus
                    className="pl-8 h-8 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>

                {/* Lista de tags disponíveis */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {filteredTags.length === 0 && !tagSearch.trim() ? (
                    <div className="text-center py-4 px-2">
                      <p className="text-xs text-slate-500 font-medium">Nenhuma tag cadastrada</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Crie tags em Configurações &gt; Tags ou digite na busca para criar.
                      </p>
                    </div>
                  ) : filteredTags.length === 0 && tagSearch.trim() ? (
                    <div className="text-center py-2.5 px-2">
                      <p className="text-xs text-slate-400">Nenhuma tag existente encontrada</p>
                    </div>
                  ) : (
                    filteredTags.map((t) => {
                      const isSelected = selectedTags.some(
                        (st) => st.toLowerCase() === t.name.toLowerCase()
                      );

                      return (
                        <div
                          key={t.id || t.name}
                          onClick={() => toggleTag(t.name)}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors",
                            isSelected
                              ? "bg-purple-50 text-purple-900 font-semibold"
                              : "hover:bg-slate-100 text-slate-700 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: t.color || "#8A3CFF" }}
                            />
                            <span className="truncate">{t.name}</span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 stroke-[2.5]" />
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Botão de adicionar nova tag caso digitado algo e não exista */}
                  {isAdd && tagSearch.trim() && !exactMatch && (
                    <button
                      type="button"
                      onClick={handleCreateAndAdd}
                      className="w-full mt-1.5 flex items-center gap-2 px-2.5 py-2 text-xs rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium transition-colors border border-dashed border-purple-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">
                        Criar e adicionar "<strong>{tagSearch.trim()}</strong>"
                      </span>
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Badges / Chips das Tags Selecionadas */}
            {selectedTags.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Tags selecionadas ({selectedTags.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => updateParam("tags", [])}
                    className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Limpar todas
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50/70 border border-slate-200/80 max-h-36 overflow-y-auto">
                  {selectedTags.map((tagName) => {
                    const tagMeta = availableTags.find(
                      (t) => t.name.toLowerCase() === tagName.toLowerCase()
                    );
                    const color = tagMeta?.color || "#8A3CFF";

                    return (
                      <span
                        key={tagName}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 shadow-2xs text-slate-700 animate-in fade-in-50"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate max-w-[150px]">{tagName}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tagName)}
                          className="text-slate-400 hover:text-rose-500 rounded-full p-0.5 hover:bg-slate-100 transition-colors cursor-pointer ml-0.5"
                          title="Remover tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 text-[11px] pt-0.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Selecione pelo menos uma tag para esta ação.</span>
              </div>
            )}
          </div>
        );
      }

      case "create_list": {
        const listName = (parameters.listName as string) || "";
        return (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Nome da Lista</Label>
            <Input
              value={listName}
              onChange={(e) => updateParam("listName", e.target.value)}
              placeholder="Ex: Campanha Black Friday 2026"
              className="h-8 rounded-xl text-xs"
            />
          </div>
        );
      }

      case "add_lead_to_list":
      case "remove_lead_from_list": {
        const listId = (parameters.listId as string) || "";
        return (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Identificador da Lista</Label>
            <Input
              value={listId}
              onChange={(e) => updateParam("listId", e.target.value)}
              placeholder="ID da lista no sistema"
              className="h-8 rounded-xl text-xs"
            />
          </div>
        );
      }

      case "add_lead_comment": {
        const comment = (parameters.comment as string) || "";
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">Comentário / Nota</Label>
              <VariablePicker
                onSelect={(val) => updateParam("comment", comment + " " + val)}
              />
            </div>
            <Textarea
              value={comment}
              onChange={(e) => updateParam("comment", e.target.value)}
              placeholder="Digite o comentário... Suporta variáveis como {{ lead.name }}"
              rows={4}
              className="rounded-xl text-xs font-mono"
            />
          </div>
        );
      }

      case "transfer_lead_assignee":
      case "transfer_deal_assignee": {
        const assigneeId = (parameters.assigneeId as string) || "";
        return (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Novo Atendente Responsável</Label>
            <Select value={assigneeId} onValueChange={(v) => updateParam("assigneeId", v)}>
              <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="Selecionar atendente..." />
              </SelectTrigger>
              <SelectContent>
                {companyMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!assigneeId && (
              <div className="flex items-center gap-1.5 text-amber-600 text-[11px]">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Selecione o atendente.</span>
              </div>
            )}
          </div>
        );
      }

      case "remove_lead_assignee":
      case "remove_deal_assignee": {
        return (
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-600 leading-relaxed">
            Esta ação removerá o atendente atualmente responsável durante a execução, deixando o registro sem responsável atribuído.
          </div>
        );
      }

      // ================= NEGÓCIOS =================
      case "create_deal": {
        const pipelineId = (parameters.pipelineId as string) || "";
        const stageId = (parameters.stageId as string) || "";
        const title = (parameters.title as string) || "";
        const value = parameters.value !== undefined ? String(parameters.value) : "0";
        const assigneeId = (parameters.assigneeId as string) || "";

        const availableStages = pipelineStages.filter((s) => s.pipeline_id === pipelineId);

        return (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Pipeline</Label>
              <Select
                value={pipelineId}
                onValueChange={(v) => {
                  onChangeConfig({
                    ...config,
                    parameters: {
                      ...parameters,
                      pipelineId: v,
                      stageId: "",
                    },
                  });
                }}
              >
                <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Selecionar pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Etapa Inicial</Label>
              <Select
                value={stageId}
                disabled={!pipelineId}
                onValueChange={(v) => updateParam("stageId", v)}
              >
                <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder={pipelineId ? "Selecionar etapa..." : "Selecione a pipeline primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Título do Negócio</Label>
                <Input
                  value={title}
                  onChange={(e) => updateParam("title", e.target.value)}
                  placeholder="Ex: Oportunidade - {{ lead.name }}"
                  className="h-8 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Valor (R$)</Label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => updateParam("value", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-8 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Atendente Responsável (Opcional)</Label>
              <Select value={assigneeId} onValueChange={(v) => updateParam("assigneeId", v)}>
                <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Mesmo do lead / nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {companyMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }

      case "move_deal_stage": {
        const pipelineId = (parameters.pipelineId as string) || "";
        const stageId = (parameters.stageId as string) || "";

        const availableStages = pipelineStages.filter((s) => s.pipeline_id === pipelineId);

        return (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Pipeline Destino</Label>
              <Select
                value={pipelineId}
                onValueChange={(v) => {
                  onChangeConfig({
                    ...config,
                    parameters: {
                      ...parameters,
                      pipelineId: v,
                      stageId: "",
                    },
                  });
                }}
              >
                <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Selecionar pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Etapa Destino</Label>
              <Select
                value={stageId}
                disabled={!pipelineId}
                onValueChange={(v) => updateParam("stageId", v)}
              >
                <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder={pipelineId ? "Selecionar etapa..." : "Selecione a pipeline primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      }

      case "win_deal":
      case "restore_deal":
      case "duplicate_deal": {
        return (
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-600 leading-relaxed">
            {actionDef.type === "win_deal" && "Esta ação marcará o negócio do contexto como GANHO no CRM."}
            {actionDef.type === "restore_deal" && "Esta ação restaurará o negócio do contexto anteriormente ganho ou perdido para o estado ATIVO."}
            {actionDef.type === "duplicate_deal" && "Esta ação criará uma cópia idêntica do negócio atual na mesma pipeline e etapa."}
          </div>
        );
      }

      case "lose_deal": {
        const lossReasonId = (parameters.lossReasonId as string) || "";
        return (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Motivo da Perda (Opcional)</Label>
            <Input
              value={lossReasonId}
              onChange={(e) => updateParam("lossReasonId", e.target.value)}
              placeholder="Digite o motivo da perda..."
              className="h-8 rounded-xl text-xs"
            />
          </div>
        );
      }

      case "add_deal_product":
      case "remove_deal_product": {
        const productId = (parameters.productId as string) || "";
        const quantity = parameters.quantity !== undefined ? Number(parameters.quantity) : 1;
        const price = parameters.price !== undefined ? Number(parameters.price) : 0;
        const isAdd = actionDef.type === "add_deal_product";

        return (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Identificador / Nome do Produto</Label>
              <Input
                value={productId}
                onChange={(e) => updateParam("productId", e.target.value)}
                placeholder="ID ou nome do produto"
                className="h-8 rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Quantidade</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => updateParam("quantity", parseInt(e.target.value) || 1)}
                  className="h-8 rounded-xl text-xs"
                />
              </div>
              {isAdd && (
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Valor Unitário (R$)</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => updateParam("price", parseFloat(e.target.value) || 0)}
                    className="h-8 rounded-xl text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        );
      }

      case "delete_deal": {
        const confirmed = !!parameters.confirmed;
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-2 text-xs text-rose-800">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>⚠ AÇÃO DESTRUTIVA</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700/90">
                Este bloco removerá o negócio associado da pipeline do CRM quando for executado.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="confirm-delete-deal"
                checked={confirmed}
                onCheckedChange={(checked) => updateParam("confirmed", !!checked)}
              />
              <label htmlFor="confirm-delete-deal" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Estou ciente e confirmo a remoção do negócio durante a execução
              </label>
            </div>

            {!confirmed && (
              <div className="flex items-center gap-1.5 text-amber-600 text-[11px]">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Marque a confirmação obrigatória para ativar este bloco.</span>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return <div className="space-y-4">{renderFields()}</div>;
};
