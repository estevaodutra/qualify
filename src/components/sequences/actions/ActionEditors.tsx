import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ActionDefinition } from "./actionRegistry";
import { VariablePicker } from "../VariablePicker";

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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState("");

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

        // Tags from leads
        const { data: leadsTags } = await supabase
          .from("leads")
          .select("tags")
          .eq("company_id", activeCompanyId)
          .not("tags", "eq", "{}");
        if (leadsTags) {
          const unique = Array.from(new Set(leadsTags.flatMap((l: any) => l.tags || []))).filter(Boolean);
          setAvailableTags(unique);
        }

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
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Nome do Lead</Label>
              <Input
                value={(parameters.name as string) || ""}
                onChange={(e) => updateParam("name", e.target.value)}
                placeholder="Ex: {{ trigger.lead_name }}"
                className="h-8 rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Telefone</Label>
                <Input
                  value={(parameters.phone as string) || ""}
                  onChange={(e) => updateParam("phone", e.target.value)}
                  placeholder="Ex: {{ trigger.phone }}"
                  className="h-8 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">E-mail</Label>
                <Input
                  value={(parameters.email as string) || ""}
                  onChange={(e) => updateParam("email", e.target.value)}
                  placeholder="Ex: contato@empresa.com"
                  className="h-8 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">CPF</Label>
                <Input
                  value={(parameters.cpf as string) || ""}
                  onChange={(e) => updateParam("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-8 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Origem</Label>
                <Input
                  value={(parameters.source as string) || ""}
                  onChange={(e) => updateParam("source", e.target.value)}
                  placeholder="Ex: Workflow"
                  className="h-8 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">Empresa</Label>
              <Input
                value={(parameters.companyName as string) || ""}
                onChange={(e) => updateParam("companyName", e.target.value)}
                placeholder="Nome da empresa do lead"
                className="h-8 rounded-xl text-xs"
              />
            </div>
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

        const toggleTag = (tag: string) => {
          const updated = selectedTags.includes(tag)
            ? selectedTags.filter((t) => t !== tag)
            : [...selectedTags, tag];
          updateParam("tags", updated);
        };

        const handleAddNewTag = () => {
          if (!tagInput.trim()) return;
          const trimmed = tagInput.trim();
          if (!selectedTags.includes(trimmed)) {
            updateParam("tags", [...selectedTags, trimmed]);
          }
          setTagInput("");
        };

        return (
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-slate-700">
              Tags a {isAdd ? "adicionar" : "remover"}
            </Label>

            {isAdd && (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Digite uma tag ou busque na lista..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewTag();
                    }
                  }}
                  className="h-8 text-xs rounded-xl flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddNewTag}
                  className="px-3 text-xs bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold shrink-0"
                >
                  Adicionar
                </button>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50/50">
              {availableTags.length === 0 && selectedTags.length === 0 ? (
                <p className="text-[11px] text-slate-400 p-2 text-center">Nenhuma tag cadastrada.</p>
              ) : (
                Array.from(new Set([...availableTags, ...selectedTags])).map((tag) => {
                  const isChecked = selectedTags.includes(tag);
                  return (
                    <div
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-xs"
                    >
                      <span className="font-medium text-slate-700">{tag}</span>
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleTag(tag)} />
                    </div>
                  );
                })
              )}
            </div>

            {selectedTags.length === 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 text-[11px]">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Selecione pelo menos uma tag.</span>
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
