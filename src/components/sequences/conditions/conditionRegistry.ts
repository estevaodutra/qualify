export type ConditionCategory =
  | 'lead'
  | 'deal'
  | 'time'
  | 'message'
  | 'instagram'
  | 'field';

export interface CategoryInfo {
  id: ConditionCategory;
  label: string;
  description: string;
  available: boolean;
}

export const CONDITION_CATEGORIES: CategoryInfo[] = [
  { id: 'lead', label: 'Leads', description: 'Adicione condições em dados do lead', available: true },
  { id: 'deal', label: 'Negócios', description: 'Condições baseadas no pipeline e funil de vendas', available: false },
  { id: 'time', label: 'Tempo', description: 'Condições de data, hora e tempo decorrido', available: false },
  { id: 'message', label: 'Mensagens', description: 'Condições de conteúdo e respostas de mensagens', available: false },
  { id: 'instagram', label: 'Instagram', description: 'Interações e eventos do Instagram Direct', available: false },
  { id: 'field', label: 'Campos', description: 'Verificações gerais de campos do sistema', available: false },
];

export interface ConditionOutput {
  id: string;
  label: string;
  color?: 'emerald' | 'destructive' | 'purple' | 'blue';
}

export interface ConditionDefinition {
  type: string;
  category: ConditionCategory;
  label: string;
  description: string;
  outputs: ConditionOutput[];
  defaultParameters: Record<string, unknown>;
}

export const CONDITION_REGISTRY: Record<string, ConditionDefinition> = {
  lead_exists: {
    type: 'lead_exists',
    category: 'lead',
    label: 'Lead existente',
    description: 'Verifica se o lead já está cadastrado',
    outputs: [
      { id: 'found', label: 'Encontrado', color: 'emerald' },
      { id: 'not_found', label: 'Não encontrado', color: 'destructive' },
    ],
    defaultParameters: {
      identifierField: 'phone',
    },
  },
  lead_has_pipeline_deal: {
    type: 'lead_has_pipeline_deal',
    category: 'lead',
    label: 'Lead possui negócio na pipeline',
    description: 'Verifica se o lead possui um negócio na pipeline selecionada',
    outputs: [
      { id: 'yes', label: 'Sim', color: 'emerald' },
      { id: 'no', label: 'Não', color: 'destructive' },
    ],
    defaultParameters: {
      pipelineId: '',
    },
  },
  lead_has_stage_deal: {
    type: 'lead_has_stage_deal',
    category: 'lead',
    label: 'Lead possui negócio na etapa',
    description: 'Verifica se o lead possui negócio em uma etapa da pipeline',
    outputs: [
      { id: 'yes', label: 'Sim', color: 'emerald' },
      { id: 'no', label: 'Não', color: 'destructive' },
    ],
    defaultParameters: {
      pipelineId: '',
      stageId: '',
    },
  },
  lead_has_email: {
    type: 'lead_has_email',
    category: 'lead',
    label: 'Lead com e-mail existente',
    description: 'Verifica se o lead já está cadastrado com um e-mail',
    outputs: [
      { id: 'yes', label: 'Sim', color: 'emerald' },
      { id: 'no', label: 'Não', color: 'destructive' },
    ],
    defaultParameters: {},
  },
  lead_has_name: {
    type: 'lead_has_name',
    category: 'lead',
    label: 'Lead com nome existente',
    description: 'Verifica se o lead já está cadastrado com um nome',
    outputs: [
      { id: 'yes', label: 'Sim', color: 'emerald' },
      { id: 'no', label: 'Não', color: 'destructive' },
    ],
    defaultParameters: {},
  },
  lead_has_phone: {
    type: 'lead_has_phone',
    category: 'lead',
    label: 'Lead com telefone existente',
    description: 'Verifica se o lead já está cadastrado com um telefone válido',
    outputs: [
      { id: 'yes', label: 'Sim', color: 'emerald' },
      { id: 'no', label: 'Não', color: 'destructive' },
    ],
    defaultParameters: {},
  },
  lead_has_cpf: {
    type: 'lead_has_cpf',
    category: 'lead',
    label: 'Lead com CPF existente',
    description: 'Verifica se o lead já está cadastrado com um CPF válido',
    outputs: [
      { id: 'yes', label: 'Sim', color: 'emerald' },
      { id: 'no', label: 'Não', color: 'destructive' },
    ],
    defaultParameters: {},
  },
  lead_has_tag: {
    type: 'lead_has_tag',
    category: 'lead',
    label: 'Lead possui uma tag',
    description: 'Verifica se o lead possui as tags informadas',
    outputs: [
      { id: 'matched', label: 'Condição atendida', color: 'emerald' },
      { id: 'not_matched', label: 'Condição não atendida', color: 'destructive' },
    ],
    defaultParameters: {
      tags: [],
      matchMode: 'ANY', // 'ANY' | 'ALL' | 'NONE'
    },
  },
  lead_has_assignee: {
    type: 'lead_has_assignee',
    category: 'lead',
    label: 'Lead possui atendente responsável',
    description: 'Verifica se o lead possui atendente responsável',
    outputs: [
      { id: 'yes', label: 'Sim', color: 'emerald' },
      { id: 'no', label: 'Não', color: 'destructive' },
    ],
    defaultParameters: {
      assigneeMode: 'ANY', // 'ANY' | 'SPECIFIC' | 'NONE'
      assigneeId: '',
    },
  },
  lead_custom_field: {
    type: 'lead_custom_field',
    category: 'lead',
    label: 'Procura se existe um lead com um campo adicional',
    description: 'Verifica se o lead possui um campo adicional com o valor informado',
    outputs: [
      { id: 'matched', label: 'Condição atendida', color: 'emerald' },
      { id: 'not_matched', label: 'Condição não atendida', color: 'destructive' },
    ],
    defaultParameters: {
      fieldKey: '',
      operator: 'equals',
      value: '',
    },
  },
};

export function getConditionDefinition(conditionType?: string): ConditionDefinition | null {
  if (!conditionType) return null;
  return CONDITION_REGISTRY[conditionType] || null;
}

export function getConditionOutputs(nodeConfig: Record<string, unknown>): ConditionOutput[] {
  const rules = (Array.isArray(nodeConfig?.rules) && nodeConfig.rules.length > 0)
    ? (nodeConfig.rules as Array<{ id: string; category: string; conditionType: string }>)
    : nodeConfig?.conditionType
    ? [{ id: 'yes', category: (nodeConfig.category as string) || 'lead', conditionType: nodeConfig.conditionType as string }]
    : [];

  if (rules.length > 0) {
    const list: ConditionOutput[] = rules.map((r, idx) => ({
      id: r.id || `rule_${idx}`,
      label: 'Se esta condição for verdadeira',
      color: 'purple',
    }));
    list.push({
      id: 'fallback',
      label: 'Quando não atender a nenhuma condição',
      color: 'destructive',
    });
    return list;
  }

  return [
    { id: 'yes', label: 'Sim', color: 'emerald' },
    { id: 'no', label: 'Não', color: 'destructive' },
  ];
}
