import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Tag as TagIcon, Layers, Users, FileText, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConditionDefinition, getConditionOutputs } from "./conditionRegistry";

interface ConditionEditorsProps {
  conditionDef: ConditionDefinition;
  config: Record<string, unknown>;
  onChangeConfig: (newConfig: Record<string, unknown>) => void;
  activeCompanyId?: string;
  customFieldsMetadata: any[];
}

export const ConditionEditors: React.FC<ConditionEditorsProps> = ({
  conditionDef,
  config,
  onChangeConfig,
  activeCompanyId,
  customFieldsMetadata,
}) => {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch Pipelines, Stages, Tags and Members for activeCompanyId
  useEffect(() => {
    const loadResources = async () => {
      if (!activeCompanyId) return;
      setLoadingData(true);
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
        console.error("Erro ao carregar recursos para editor de condição:", err);
      } finally {
        setLoadingData(false);
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
  const outputs = getConditionOutputs(config);

  // Render specific condition configuration
  const renderFields = () => {
    switch (conditionDef.type) {
      case "lead_exists": {
        const identifierField = (parameters.identifierField as string) || "phone";
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Identificador Utilizado</Label>
              <Select value={identifierField} onValueChange={(v) => updateParam("identifierField", v)}>
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Selecione o identificador..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="id">ID do Lead</SelectItem>
                  {customFieldsMetadata.map((field) => (
                    <SelectItem key={field.id} value={`custom:${field.key}`}>
                      Campo: {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Determina qual dado do contexto será consultado no banco de dados para verificar a existência.
              </p>
            </div>
          </div>
        );
      }

      case "lead_has_pipeline_deal": {
        const pipelineId = (parameters.pipelineId as string) || "";
        const isInvalid = !pipelineId;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Pipeline</Label>
              <Select value={pipelineId} onValueChange={(v) => updateParam("pipelineId", v)}>
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
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
              {isInvalid && (
                <div className="flex items-center gap-1.5 text-amber-600 text-[11px] mt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Selecione uma pipeline válida.</span>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "lead_has_stage_deal": {
        const pipelineId = (parameters.pipelineId as string) || "";
        const stageId = (parameters.stageId as string) || "";

        const availableStages = pipelineStages.filter((s) => s.pipeline_id === pipelineId);
        const isPipelineInvalid = !pipelineId;
        const isStageInvalid = !stageId;

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Pipeline</Label>
              <Select
                value={pipelineId}
                onValueChange={(v) => {
                  onChangeConfig({
                    ...config,
                    parameters: {
                      ...parameters,
                      pipelineId: v,
                      stageId: "", // reset stage on pipeline change
                    },
                  });
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
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

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Etapa</Label>
              <Select
                value={stageId}
                disabled={!pipelineId}
                onValueChange={(v) => updateParam("stageId", v)}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder={pipelineId ? "Selecionar etapa..." : "Selecione primeiro uma pipeline"} />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(isPipelineInvalid || isStageInvalid) && (
                <div className="flex items-center gap-1.5 text-amber-600 text-[11px] mt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Pipeline e Etapa são campos obrigatórios.</span>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "lead_has_email":
      case "lead_has_name":
      case "lead_has_phone":
      case "lead_has_cpf": {
        return (
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-600 leading-relaxed">
            Esta condição avalia automaticamente o preenchimento e existência do dado no cadastro do lead durante a execução.
            {(conditionDef.type === "lead_has_phone" || conditionDef.type === "lead_has_cpf") && (
              <p className="mt-2 text-[11px] text-purple-600 font-medium">
                ✓ Normalização automática aplicada antes da verificação (ignora diferenças de formatação como pontuações e parênteses).
              </p>
            )}
          </div>
        );
      }

      case "lead_has_tag": {
        const selectedTags = (parameters.tags as string[]) || [];
        const matchMode = (parameters.matchMode as string) || "ANY";
        const [tagSearch, setTagSearch] = useState("");

        const filteredTags = availableTags.filter((t) =>
          t.toLowerCase().includes(tagSearch.toLowerCase())
        );

        const isInvalid = selectedTags.length === 0;

        const toggleTag = (tag: string) => {
          const updated = selectedTags.includes(tag)
            ? selectedTags.filter((t) => t !== tag)
            : [...selectedTags, tag];
          updateParam("tags", updated);
        };

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Regra de Correspondência</Label>
              <Select value={matchMode} onValueChange={(v) => updateParam("matchMode", v)}>
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Lead possui QUALQUER uma das tags</SelectItem>
                  <SelectItem value="ALL">Lead possui TODAS as tags</SelectItem>
                  <SelectItem value="NONE">Lead NÃO possui nenhuma das tags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">Tags da Empresa</Label>
                <span className="text-[11px] text-slate-400">{selectedTags.length} selecionada(s)</span>
              </div>

              <Input
                type="text"
                placeholder="Buscar tag..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="h-8 text-xs rounded-xl"
              />

              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1.5 bg-slate-50/50">
                {filteredTags.length === 0 ? (
                  <p className="text-[11px] text-slate-400 p-2 text-center">
                    {availableTags.length === 0 ? "Nenhuma tag cadastrada no workspace." : "Nenhuma tag encontrada."}
                  </p>
                ) : (
                  filteredTags.map((tag) => {
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

              {isInvalid && (
                <div className="flex items-center gap-1.5 text-amber-600 text-[11px] mt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Selecione pelo menos uma tag.</span>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "lead_has_assignee": {
        const assigneeMode = (parameters.assigneeMode as string) || "ANY";
        const assigneeId = (parameters.assigneeId as string) || "";
        const isInvalid = assigneeMode === "SPECIFIC" && !assigneeId;

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Verificação de Atendente</Label>
              <RadioGroup
                value={assigneeMode}
                onValueChange={(v) => updateParam("assigneeMode", v)}
                className="space-y-2 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ANY" id="r-any" />
                  <label htmlFor="r-any" className="cursor-pointer text-slate-700">Possui qualquer atendente</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SPECIFIC" id="r-specific" />
                  <label htmlFor="r-specific" className="cursor-pointer text-slate-700">Possui atendente específico</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NONE" id="r-none" />
                  <label htmlFor="r-none" className="cursor-pointer text-slate-700">Não possui atendente</label>
                </div>
              </RadioGroup>
            </div>

            {assigneeMode === "SPECIFIC" && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                <Label className="text-xs font-semibold text-slate-700">Atendente Responsável</Label>
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
                {isInvalid && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-[11px] mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Selecione o atendente específico.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case "lead_custom_field": {
        const fieldKey = (parameters.fieldKey as string) || "";
        const operator = (parameters.operator as string) || "equals";
        const rawValue = parameters.value;
        const valueStr = rawValue === undefined || rawValue === null ? "" : String(rawValue);

        const selectedFieldMeta = customFieldsMetadata.find((f) => f.key === fieldKey);
        const fieldType = selectedFieldMeta?.field_type || "text";
        const optionsList = (selectedFieldMeta?.options as string[]) || [];

        // Determine available operators by field type
        const getOperatorsForType = () => {
          switch (fieldType) {
            case "number":
              return [
                { id: "equals", label: "=" },
                { id: "not_equals", label: "≠" },
                { id: "greater_than", label: ">" },
                { id: "less_than", label: "<" },
                { id: "greater_or_equals", label: "≥" },
                { id: "less_or_equals", label: "≤" },
                { id: "is_empty", label: "está vazio" },
                { id: "is_set", label: "não está vazio" },
              ];
            case "boolean":
              return [
                { id: "is_true", label: "é verdadeiro" },
                { id: "is_false", label: "é falso" },
              ];
            case "date":
              return [
                { id: "equals", label: "é igual a" },
                { id: "before", label: "antes de" },
                { id: "after", label: "depois de" },
                { id: "is_empty", label: "está vazio" },
                { id: "is_set", label: "não está vazio" },
              ];
            case "select":
              return [
                { id: "equals", label: "é igual a" },
                { id: "not_equals", label: "é diferente de" },
                { id: "is_empty", label: "está vazio" },
                { id: "is_set", label: "não está vazio" },
              ];
            default: // text
              return [
                { id: "equals", label: "é igual a" },
                { id: "not_equals", label: "é diferente de" },
                { id: "contains", label: "contém" },
                { id: "not_contains", label: "não contém" },
                { id: "starts_with", label: "começa com" },
                { id: "ends_with", label: "termina com" },
                { id: "is_empty", label: "está vazio" },
                { id: "is_set", label: "não está vazio" },
              ];
          }
        };

        const operators = getOperatorsForType();
        const requiresValue =
          operator !== "is_empty" &&
          operator !== "is_set" &&
          operator !== "is_true" &&
          operator !== "is_false";

        const isFieldInvalid = !fieldKey;
        const isOperatorInvalid = !operator;
        const isValueInvalid = requiresValue && !valueStr.trim();

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Campo Adicional</Label>
              <Select
                value={fieldKey}
                onValueChange={(v) => {
                  const meta = customFieldsMetadata.find((f) => f.key === v);
                  const firstOp = meta?.field_type === "boolean" ? "is_true" : "equals";
                  onChangeConfig({
                    ...config,
                    parameters: {
                      ...parameters,
                      fieldKey: v,
                      operator: firstOp,
                      value: "",
                    },
                  });
                }}
              >
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Selecionar campo adicional..." />
                </SelectTrigger>
                <SelectContent>
                  {customFieldsMetadata.map((f) => (
                    <SelectItem key={f.id} value={f.key}>
                      {f.name} ({f.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Operador</Label>
              <Select value={operator} onValueChange={(v) => updateParam("operator", v)}>
                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Selecionar operador..." />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresValue && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <Label className="text-xs font-semibold text-slate-700">Valor</Label>
                {fieldType === "select" && optionsList.length > 0 ? (
                  <Select value={valueStr} onValueChange={(v) => updateParam("value", v)}>
                    <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                      <SelectValue placeholder="Selecionar valor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsList.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : fieldType === "date" ? (
                  <Input
                    type="date"
                    value={valueStr}
                    onChange={(e) => updateParam("value", e.target.value)}
                    className="rounded-xl border-slate-200 text-xs"
                  />
                ) : (
                  <Input
                    type={fieldType === "number" ? "number" : "text"}
                    placeholder="Digite o valor..."
                    value={valueStr}
                    onChange={(e) => updateParam("value", e.target.value)}
                    className="rounded-xl border-slate-200 text-xs"
                  />
                )}
              </div>
            )}

            {(isFieldInvalid || isOperatorInvalid || isValueInvalid) && (
              <div className="flex items-center gap-1.5 text-amber-600 text-[11px] mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Preencha todos os campos obrigatórios.</span>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Form per condition */}
      {renderFields()}

      {/* RESULTADOS Summary Box */}
      <div className="border border-slate-100 bg-slate-50/70 rounded-xl p-4 space-y-2.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Resultados Possíveis (Handles no Flow)
        </p>

        <div className="space-y-1.5">
          {outputs.map((out) => (
            <div key={out.id} className="flex items-center gap-2 text-xs font-medium">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  out.color === "emerald"
                    ? "bg-emerald-500"
                    : out.color === "destructive"
                    ? "bg-rose-500"
                    : "bg-purple-500"
                }`}
              />
              <span className="text-slate-700">{out.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
