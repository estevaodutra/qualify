export type ActionCategory =
  | 'lead'
  | 'deal'
  | 'message'
  | 'product'
  | 'system'
  | 'activity';

export interface ActionCategoryInfo {
  id: ActionCategory;
  label: string;
  description: string;
  available: boolean;
}

export const ACTION_CATEGORIES: ActionCategoryInfo[] = [
  { id: 'lead', label: 'Leads', description: 'Adicione ações em dados do lead', available: true },
  { id: 'deal', label: 'Negócios', description: 'Operações de pipelines e negociações do CRM', available: true },
  { id: 'message', label: 'Mensagens', description: 'Envio de conteúdo e respostas automáticas', available: false },
  { id: 'product', label: 'Produtos', description: 'Gestão de catálogo e itens do pedido', available: false },
  { id: 'system', label: 'Sistema', description: 'Variáveis de sistema e utilitários', available: false },
  { id: 'activity', label: 'Atividades', description: 'Tarefas, lembretes e agendamentos', available: false },
];

export interface ActionDefinition {
  type: string;
  category: ActionCategory;
  label: string;
  description: string;
  isDestructive?: boolean;
  defaultParameters: Record<string, unknown>;
}

export const ACTION_REGISTRY: Record<string, ActionDefinition> = {
  // ================= LEADS =================
  create_lead: {
    type: 'create_lead',
    category: 'lead',
    label: 'Criar lead',
    description: 'Cria o lead com as informações guardadas nos parâmetros da sessão. Caso o lead já existir, não será criado um novo lead',
    defaultParameters: {
      name: '',
      phone: '',
      email: '',
      cpf: '',
      source: '',
      companyName: '',
      tags: [],
    },
  },
  delete_lead: {
    type: 'delete_lead',
    category: 'lead',
    label: 'Deletar lead',
    description: 'Remove o lead relacionado à execução',
    isDestructive: true,
    defaultParameters: {
      confirmed: false,
    },
  },
  create_tag: {
    type: 'create_tag',
    category: 'lead',
    label: 'Criar tag',
    description: 'Cria uma nova tag de lead na empresa',
    defaultParameters: {
      tagName: '',
      color: '#8A3CFF',
    },
  },
  add_lead_tags: {
    type: 'add_lead_tags',
    category: 'lead',
    label: 'Adicionar tags',
    description: 'Adicione uma ou mais tags ao lead do contexto',
    defaultParameters: {
      tags: [],
    },
  },
  remove_lead_tags: {
    type: 'remove_lead_tags',
    category: 'lead',
    label: 'Remover tags',
    description: 'Remove tags selecionadas do lead do contexto',
    defaultParameters: {
      tags: [],
    },
  },
  create_list: {
    type: 'create_list',
    category: 'lead',
    label: 'Criar lista',
    description: 'Cria uma nova lista de leads na empresa',
    defaultParameters: {
      listName: '',
    },
  },
  add_lead_to_list: {
    type: 'add_lead_to_list',
    category: 'lead',
    label: 'Adicionar à lista',
    description: 'Associa o lead a uma lista da empresa',
    defaultParameters: {
      listId: '',
    },
  },
  remove_lead_from_list: {
    type: 'remove_lead_from_list',
    category: 'lead',
    label: 'Remover da lista',
    description: 'Remove o lead de uma lista da empresa',
    defaultParameters: {
      listId: '',
    },
  },
  add_lead_comment: {
    type: 'add_lead_comment',
    category: 'lead',
    label: 'Adicionar comentário ao lead',
    description: 'Registra uma nota/comentário no histórico do lead',
    defaultParameters: {
      comment: '',
    },
  },
  transfer_lead_assignee: {
    type: 'transfer_lead_assignee',
    category: 'lead',
    label: 'Transferir atendente do lead',
    description: 'Atualiza o atendente responsável pelo lead',
    defaultParameters: {
      assigneeId: '',
    },
  },
  remove_lead_assignee: {
    type: 'remove_lead_assignee',
    category: 'lead',
    label: 'Remover atendente do lead',
    description: 'Remove o responsável atual do lead (deixa sem atendente)',
    defaultParameters: {},
  },

  // ================= NEGÓCIOS =================
  create_deal: {
    type: 'create_deal',
    category: 'deal',
    label: 'Criar negócio',
    description: 'Cria um novo negócio associado ao lead',
    defaultParameters: {
      pipelineId: '',
      stageId: '',
      title: '',
      value: 0,
      assigneeId: '',
    },
  },
  move_deal_stage: {
    type: 'move_deal_stage',
    category: 'deal',
    label: 'Mover negócio de etapa',
    description: 'Move um negócio para outra etapa do CRM',
    defaultParameters: {
      pipelineId: '',
      stageId: '',
    },
  },
  win_deal: {
    type: 'win_deal',
    category: 'deal',
    label: 'Ganhar negócio',
    description: 'Marca o negócio como ganho no CRM',
    defaultParameters: {},
  },
  lose_deal: {
    type: 'lose_deal',
    category: 'deal',
    label: 'Perder negócio',
    description: 'Marca o negócio como perdido com um motivo opcional',
    defaultParameters: {
      lossReasonId: '',
    },
  },
  restore_deal: {
    type: 'restore_deal',
    category: 'deal',
    label: 'Restaurar negócio',
    description: 'Reabre um negócio ganho ou perdido para o estado ativo',
    defaultParameters: {},
  },
  transfer_deal_assignee: {
    type: 'transfer_deal_assignee',
    category: 'deal',
    label: 'Transferir atendente do negócio',
    description: 'Altera o atendente responsável pelo negócio',
    defaultParameters: {
      assigneeId: '',
    },
  },
  remove_deal_assignee: {
    type: 'remove_deal_assignee',
    category: 'deal',
    label: 'Remover atendente do negócio',
    description: 'Remove o responsável atual do negócio',
    defaultParameters: {},
  },
  duplicate_deal: {
    type: 'duplicate_deal',
    category: 'deal',
    label: 'Duplicar negócio',
    description: 'Cria uma cópia do negócio atual na mesma pipeline/etapa',
    defaultParameters: {},
  },
  add_deal_product: {
    type: 'add_deal_product',
    category: 'deal',
    label: 'Adicionar produto ao negócio',
    description: 'Vincula um produto com quantidade e valor ao negócio',
    defaultParameters: {
      productId: '',
      quantity: 1,
      price: 0,
    },
  },
  remove_deal_product: {
    type: 'remove_deal_product',
    category: 'deal',
    label: 'Remover produto do negócio',
    description: 'Remove um produto do negócio do contexto',
    defaultParameters: {
      productId: '',
      quantity: 1,
    },
  },
  delete_deal: {
    type: 'delete_deal',
    category: 'deal',
    label: 'Remover negócio',
    description: 'Exclui permanentemente o negócio do CRM',
    isDestructive: true,
    defaultParameters: {
      confirmed: false,
    },
  },
};

export function getActionDefinition(actionType?: string): ActionDefinition | null {
  if (!actionType) return null;
  return ACTION_REGISTRY[actionType] || null;
}
