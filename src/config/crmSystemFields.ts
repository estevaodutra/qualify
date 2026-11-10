export type CrmFieldEntity = "lead" | "company" | "deal";

export interface CrmSystemFieldDefinition {
  key: string;
  name: string;
  description: string;
  type: string;
  category: CrmFieldEntity;
  group_name: string;
  source_column: string;
  is_visible: boolean;
  is_private: boolean;
  is_required: boolean;
  order_index: number;
}

export const CRM_SYSTEM_FIELDS: CrmSystemFieldDefinition[] = [
  // ============================================================
  // LEAD / PESSOA
  // ============================================================
  { key: "name", name: "Nome completo", description: "Nome completo da pessoa/lead.", type: "text", category: "lead", group_name: "Dados Pessoais", source_column: "name", is_visible: true, is_private: false, is_required: true, order_index: 10 },
  { key: "first_name", name: "Primeiro nome", description: "Primeiro nome da pessoa.", type: "text", category: "lead", group_name: "Dados Pessoais", source_column: "first_name", is_visible: true, is_private: false, is_required: false, order_index: 20 },
  { key: "last_name", name: "Sobrenome", description: "Sobrenome da pessoa.", type: "text", category: "lead", group_name: "Dados Pessoais", source_column: "last_name", is_visible: true, is_private: false, is_required: false, order_index: 30 },
  { key: "phone", name: "Telefone / WhatsApp", description: "Telefone principal da pessoa.", type: "phone", category: "lead", group_name: "Contato", source_column: "phone", is_visible: true, is_private: false, is_required: false, order_index: 40 },
  { key: "telefone_fixo", name: "Telefone fixo", description: "Telefone fixo ou alternativo.", type: "phone", category: "lead", group_name: "Contato", source_column: "telefone_fixo", is_visible: true, is_private: false, is_required: false, order_index: 50 },
  { key: "email", name: "E-mail", description: "E-mail principal da pessoa.", type: "email", category: "lead", group_name: "Contato", source_column: "email", is_visible: true, is_private: false, is_required: false, order_index: 60 },
  { key: "document", name: "CPF / Documento", description: "Documento principal da pessoa.", type: "text", category: "lead", group_name: "Dados Pessoais", source_column: "document", is_visible: true, is_private: true, is_required: false, order_index: 70 },
  { key: "birth_date", name: "Data de nascimento", description: "Data de nascimento da pessoa.", type: "date", category: "lead", group_name: "Dados Pessoais", source_column: "birth_date", is_visible: false, is_private: true, is_required: false, order_index: 80 },
  { key: "company", name: "Empresa", description: "Empresa do CRM vinculada à pessoa.", type: "relation", category: "lead", group_name: "Vínculos", source_column: "crm_company_id", is_visible: true, is_private: false, is_required: false, order_index: 90 },
  { key: "owner_id", name: "Responsável", description: "Responsável interno pelo lead.", type: "relation", category: "lead", group_name: "CRM", source_column: "owner_id", is_visible: true, is_private: false, is_required: false, order_index: 100 },
  { key: "status", name: "Status", description: "Status atual do lead.", type: "select", category: "lead", group_name: "CRM", source_column: "status", is_visible: true, is_private: false, is_required: false, order_index: 110 },
  { key: "tags", name: "Tags", description: "Tags vinculadas ao lead.", type: "multi_select", category: "lead", group_name: "CRM", source_column: "tags", is_visible: true, is_private: false, is_required: false, order_index: 120 },
  { key: "source_type", name: "Tipo de origem", description: "Canal/origem principal do lead.", type: "text", category: "lead", group_name: "Origem", source_column: "source_type", is_visible: true, is_private: false, is_required: false, order_index: 130 },
  { key: "source_name", name: "Origem", description: "Nome da origem de aquisição.", type: "text", category: "lead", group_name: "Origem", source_column: "source_name", is_visible: true, is_private: false, is_required: false, order_index: 140 },
  { key: "source_campaign_id", name: "ID da campanha de origem", description: "Identificador da campanha que originou o lead.", type: "text", category: "lead", group_name: "Origem", source_column: "source_campaign_id", is_visible: false, is_private: false, is_required: false, order_index: 150 },
  { key: "source_group_name", name: "Grupo / conjunto de origem", description: "Grupo, conjunto ou origem intermediária.", type: "text", category: "lead", group_name: "Origem", source_column: "source_group_name", is_visible: false, is_private: false, is_required: false, order_index: 160 },
  { key: "website", name: "Site", description: "Site ou página relacionada ao lead.", type: "url", category: "lead", group_name: "Contato", source_column: "website", is_visible: false, is_private: false, is_required: false, order_index: 170 },
  { key: "last_contact_at", name: "Último contato", description: "Data/hora do último contato.", type: "datetime", category: "lead", group_name: "Atividade", source_column: "last_contact_at", is_visible: true, is_private: false, is_required: false, order_index: 180 },
  { key: "last_interaction_at", name: "Última interação", description: "Data/hora da última interação registrada.", type: "datetime", category: "lead", group_name: "Atividade", source_column: "last_interaction_at", is_visible: false, is_private: false, is_required: false, order_index: 190 },
  { key: "next_activity_at", name: "Próxima atividade", description: "Data/hora da próxima atividade planejada.", type: "datetime", category: "lead", group_name: "Atividade", source_column: "next_activity_at", is_visible: true, is_private: false, is_required: false, order_index: 200 },
  { key: "total_calls", name: "Total de ligações", description: "Quantidade acumulada de ligações.", type: "number", category: "lead", group_name: "Atividade", source_column: "total_calls", is_visible: false, is_private: false, is_required: false, order_index: 210 },
  { key: "total_messages", name: "Total de mensagens", description: "Quantidade acumulada de mensagens.", type: "number", category: "lead", group_name: "Atividade", source_column: "total_messages", is_visible: false, is_private: false, is_required: false, order_index: 220 },
  { key: "created_at", name: "Criado em", description: "Data de criação do lead.", type: "datetime", category: "lead", group_name: "Sistema", source_column: "created_at", is_visible: false, is_private: false, is_required: false, order_index: 230 },
  { key: "updated_at", name: "Atualizado em", description: "Data da última atualização do lead.", type: "datetime", category: "lead", group_name: "Sistema", source_column: "updated_at", is_visible: false, is_private: false, is_required: false, order_index: 240 },

  // ============================================================
  // EMPRESA DO CRM
  // ============================================================
  { key: "name", name: "Razão social / Nome", description: "Nome principal da empresa.", type: "text", category: "company", group_name: "Dados da Empresa", source_column: "name", is_visible: true, is_private: false, is_required: true, order_index: 10 },
  { key: "trade_name", name: "Nome fantasia", description: "Nome fantasia da empresa.", type: "text", category: "company", group_name: "Dados da Empresa", source_column: "trade_name", is_visible: true, is_private: false, is_required: false, order_index: 20 },
  { key: "document", name: "CNPJ / Documento", description: "Documento fiscal da empresa.", type: "text", category: "company", group_name: "Dados da Empresa", source_column: "document", is_visible: true, is_private: true, is_required: false, order_index: 30 },
  { key: "segment", name: "Segmento", description: "Segmento ou mercado da empresa.", type: "text", category: "company", group_name: "Dados da Empresa", source_column: "segment", is_visible: true, is_private: false, is_required: false, order_index: 40 },
  { key: "phone", name: "Telefone", description: "Telefone principal da empresa.", type: "phone", category: "company", group_name: "Contato", source_column: "phone", is_visible: true, is_private: false, is_required: false, order_index: 50 },
  { key: "email", name: "E-mail", description: "E-mail principal da empresa.", type: "email", category: "company", group_name: "Contato", source_column: "email", is_visible: true, is_private: false, is_required: false, order_index: 60 },
  { key: "website", name: "Site", description: "Site oficial da empresa.", type: "url", category: "company", group_name: "Contato", source_column: "website", is_visible: true, is_private: false, is_required: false, order_index: 70 },
  { key: "owner_id", name: "Responsável", description: "Responsável interno pela empresa.", type: "relation", category: "company", group_name: "CRM", source_column: "owner_id", is_visible: true, is_private: false, is_required: false, order_index: 80 },
  { key: "street", name: "Logradouro", description: "Rua, avenida ou logradouro.", type: "text", category: "company", group_name: "Endereço", source_column: "street", is_visible: false, is_private: false, is_required: false, order_index: 90 },
  { key: "address_number", name: "Número", description: "Número do endereço.", type: "text", category: "company", group_name: "Endereço", source_column: "address_number", is_visible: false, is_private: false, is_required: false, order_index: 100 },
  { key: "complement", name: "Complemento", description: "Complemento do endereço.", type: "text", category: "company", group_name: "Endereço", source_column: "complement", is_visible: false, is_private: false, is_required: false, order_index: 110 },
  { key: "neighborhood", name: "Bairro", description: "Bairro.", type: "text", category: "company", group_name: "Endereço", source_column: "neighborhood", is_visible: false, is_private: false, is_required: false, order_index: 120 },
  { key: "city", name: "Cidade", description: "Cidade.", type: "text", category: "company", group_name: "Endereço", source_column: "city", is_visible: false, is_private: false, is_required: false, order_index: 130 },
  { key: "state", name: "Estado / UF", description: "Estado ou UF.", type: "text", category: "company", group_name: "Endereço", source_column: "state", is_visible: false, is_private: false, is_required: false, order_index: 140 },
  { key: "postal_code", name: "CEP", description: "CEP da empresa.", type: "text", category: "company", group_name: "Endereço", source_column: "postal_code", is_visible: false, is_private: false, is_required: false, order_index: 150 },
  { key: "created_at", name: "Criada em", description: "Data de criação da empresa no CRM.", type: "datetime", category: "company", group_name: "Sistema", source_column: "created_at", is_visible: false, is_private: false, is_required: false, order_index: 160 },
  { key: "updated_at", name: "Atualizada em", description: "Data da última atualização da empresa.", type: "datetime", category: "company", group_name: "Sistema", source_column: "updated_at", is_visible: false, is_private: false, is_required: false, order_index: 170 },

  // ============================================================
  // NEGÓCIO
  // ============================================================
  { key: "title", name: "Nome do negócio", description: "Título principal do negócio.", type: "text", category: "deal", group_name: "Dados do Negócio", source_column: "title", is_visible: true, is_private: false, is_required: true, order_index: 10 },
  { key: "lead_id", name: "Lead / Pessoa", description: "Pessoa principal vinculada ao negócio.", type: "relation", category: "deal", group_name: "Vínculos", source_column: "lead_id", is_visible: true, is_private: false, is_required: true, order_index: 20 },
  { key: "company", name: "Empresa", description: "Empresa do CRM vinculada ao negócio.", type: "relation", category: "deal", group_name: "Vínculos", source_column: "crm_company_id", is_visible: true, is_private: false, is_required: false, order_index: 30 },
  { key: "pipeline_id", name: "Pipeline", description: "Pipeline atual do negócio.", type: "relation", category: "deal", group_name: "Pipeline", source_column: "pipeline_id", is_visible: true, is_private: false, is_required: false, order_index: 40 },
  { key: "stage_id", name: "Etapa", description: "Etapa atual da pipeline.", type: "relation", category: "deal", group_name: "Pipeline", source_column: "stage_id", is_visible: true, is_private: false, is_required: false, order_index: 50 },
  { key: "value", name: "Valor", description: "Valor financeiro do negócio.", type: "currency", category: "deal", group_name: "Dados do Negócio", source_column: "value", is_visible: true, is_private: false, is_required: false, order_index: 60 },
  { key: "currency", name: "Moeda", description: "Moeda utilizada no negócio.", type: "text", category: "deal", group_name: "Dados do Negócio", source_column: "currency", is_visible: false, is_private: false, is_required: false, order_index: 70 },
  { key: "status", name: "Status", description: "Status atual do negócio.", type: "select", category: "deal", group_name: "Pipeline", source_column: "status", is_visible: true, is_private: false, is_required: false, order_index: 80 },
  { key: "owner_id", name: "Responsável", description: "Responsável pelo negócio.", type: "relation", category: "deal", group_name: "CRM", source_column: "owner_id", is_visible: true, is_private: false, is_required: false, order_index: 90 },
  { key: "priority", name: "Prioridade", description: "Prioridade comercial do negócio.", type: "select", category: "deal", group_name: "CRM", source_column: "priority", is_visible: true, is_private: false, is_required: false, order_index: 100 },
  { key: "probability", name: "Probabilidade", description: "Probabilidade estimada de fechamento.", type: "number", category: "deal", group_name: "CRM", source_column: "probability", is_visible: true, is_private: false, is_required: false, order_index: 110 },
  { key: "expected_close_date", name: "Previsão de fechamento", description: "Data prevista de fechamento.", type: "date", category: "deal", group_name: "CRM", source_column: "expected_close_date", is_visible: true, is_private: false, is_required: false, order_index: 120 },
  { key: "description", name: "Descrição", description: "Descrição e contexto do negócio.", type: "textarea", category: "deal", group_name: "Dados do Negócio", source_column: "description", is_visible: false, is_private: false, is_required: false, order_index: 130 },
  { key: "last_activity_at", name: "Última atividade", description: "Data/hora da última atividade do negócio.", type: "datetime", category: "deal", group_name: "Atividade", source_column: "last_activity_at", is_visible: false, is_private: false, is_required: false, order_index: 140 },
  { key: "next_activity_at", name: "Próxima atividade", description: "Data/hora da próxima atividade.", type: "datetime", category: "deal", group_name: "Atividade", source_column: "next_activity_at", is_visible: true, is_private: false, is_required: false, order_index: 150 },
  { key: "won_at", name: "Ganho em", description: "Data/hora em que o negócio foi ganho.", type: "datetime", category: "deal", group_name: "Fechamento", source_column: "won_at", is_visible: false, is_private: false, is_required: false, order_index: 160 },
  { key: "lost_at", name: "Perdido em", description: "Data/hora em que o negócio foi perdido.", type: "datetime", category: "deal", group_name: "Fechamento", source_column: "lost_at", is_visible: false, is_private: false, is_required: false, order_index: 170 },
  { key: "lost_reason_id", name: "Motivo de perda", description: "Motivo associado à perda do negócio.", type: "relation", category: "deal", group_name: "Fechamento", source_column: "lost_reason_id", is_visible: true, is_private: false, is_required: false, order_index: 180 },
  { key: "created_at", name: "Criado em", description: "Data de criação do negócio.", type: "datetime", category: "deal", group_name: "Sistema", source_column: "created_at", is_visible: false, is_private: false, is_required: false, order_index: 190 },
  { key: "updated_at", name: "Atualizado em", description: "Data da última atualização do negócio.", type: "datetime", category: "deal", group_name: "Sistema", source_column: "updated_at", is_visible: false, is_private: false, is_required: false, order_index: 200 },
];

export function buildVirtualCrmSystemFields(companyId: string) {
  return CRM_SYSTEM_FIELDS.map((field) => ({
    id: `system:${field.category}:${field.key}`,
    company_id: companyId,
    ...field,
    is_system: true,
    is_virtual_system: true,
    options: [],
  }));
}
