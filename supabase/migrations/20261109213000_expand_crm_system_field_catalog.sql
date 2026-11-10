-- ============================================================
-- EXPAND CRM SYSTEM FIELD CATALOG
-- Requires 20261109210000_crm_field_registry_and_companies.sql first.
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_crm_system_fields(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.custom_fields_metadata
    (company_id, name, key, description, type, category, group_name, is_visible, is_private, is_system, source_column, is_required, order_index)
  VALUES
    -- LEAD / PESSOA
    (p_company_id,'Nome completo','name','Nome completo da pessoa/lead.','text','lead','Dados Pessoais',true,false,true,'name',true,10),
    (p_company_id,'Primeiro nome','first_name','Primeiro nome da pessoa.','text','lead','Dados Pessoais',true,false,true,'first_name',false,20),
    (p_company_id,'Sobrenome','last_name','Sobrenome da pessoa.','text','lead','Dados Pessoais',true,false,true,'last_name',false,30),
    (p_company_id,'Telefone / WhatsApp','phone','Telefone principal da pessoa.','phone','lead','Contato',true,false,true,'phone',false,40),
    (p_company_id,'Telefone fixo','telefone_fixo','Telefone fixo ou alternativo.','phone','lead','Contato',true,false,true,'telefone_fixo',false,50),
    (p_company_id,'E-mail','email','E-mail principal da pessoa.','email','lead','Contato',true,false,true,'email',false,60),
    (p_company_id,'CPF / Documento','document','Documento principal da pessoa.','text','lead','Dados Pessoais',true,true,true,'document',false,70),
    (p_company_id,'Data de nascimento','birth_date','Data de nascimento da pessoa.','date','lead','Dados Pessoais',false,true,true,'birth_date',false,80),
    (p_company_id,'Empresa','company','Empresa do CRM vinculada à pessoa.','relation','lead','Vínculos',true,false,true,'crm_company_id',false,90),
    (p_company_id,'Responsável','owner_id','Responsável interno pelo lead.','relation','lead','CRM',true,false,true,'owner_id',false,100),
    (p_company_id,'Status','status','Status atual do lead.','select','lead','CRM',true,false,true,'status',false,110),
    (p_company_id,'Tags','tags','Tags vinculadas ao lead.','multi_select','lead','CRM',true,false,true,'tags',false,120),
    (p_company_id,'Tipo de origem','source_type','Canal/origem principal do lead.','text','lead','Origem',true,false,true,'source_type',false,130),
    (p_company_id,'Origem','source_name','Nome da origem de aquisição.','text','lead','Origem',true,false,true,'source_name',false,140),
    (p_company_id,'ID da campanha de origem','source_campaign_id','Identificador da campanha que originou o lead.','text','lead','Origem',false,false,true,'source_campaign_id',false,150),
    (p_company_id,'Grupo / conjunto de origem','source_group_name','Grupo, conjunto ou origem intermediária.','text','lead','Origem',false,false,true,'source_group_name',false,160),
    (p_company_id,'Site','website','Site ou página relacionada ao lead.','url','lead','Contato',false,false,true,'website',false,170),
    (p_company_id,'Último contato','last_contact_at','Data/hora do último contato.','datetime','lead','Atividade',true,false,true,'last_contact_at',false,180),
    (p_company_id,'Última interação','last_interaction_at','Data/hora da última interação registrada.','datetime','lead','Atividade',false,false,true,'last_interaction_at',false,190),
    (p_company_id,'Próxima atividade','next_activity_at','Data/hora da próxima atividade planejada.','datetime','lead','Atividade',true,false,true,'next_activity_at',false,200),
    (p_company_id,'Total de ligações','total_calls','Quantidade acumulada de ligações.','number','lead','Atividade',false,false,true,'total_calls',false,210),
    (p_company_id,'Total de mensagens','total_messages','Quantidade acumulada de mensagens.','number','lead','Atividade',false,false,true,'total_messages',false,220),
    (p_company_id,'Criado em','created_at','Data de criação do lead.','datetime','lead','Sistema',false,false,true,'created_at',false,230),
    (p_company_id,'Atualizado em','updated_at','Data da última atualização do lead.','datetime','lead','Sistema',false,false,true,'updated_at',false,240),

    -- EMPRESA CRM
    (p_company_id,'Razão social / Nome','name','Nome principal da empresa.','text','company','Dados da Empresa',true,false,true,'name',true,10),
    (p_company_id,'Nome fantasia','trade_name','Nome fantasia da empresa.','text','company','Dados da Empresa',true,false,true,'trade_name',false,20),
    (p_company_id,'CNPJ / Documento','document','Documento fiscal da empresa.','text','company','Dados da Empresa',true,true,true,'document',false,30),
    (p_company_id,'Segmento','segment','Segmento ou mercado da empresa.','text','company','Dados da Empresa',true,false,true,'segment',false,40),
    (p_company_id,'Telefone','phone','Telefone principal da empresa.','phone','company','Contato',true,false,true,'phone',false,50),
    (p_company_id,'E-mail','email','E-mail principal da empresa.','email','company','Contato',true,false,true,'email',false,60),
    (p_company_id,'Site','website','Site oficial da empresa.','url','company','Contato',true,false,true,'website',false,70),
    (p_company_id,'Responsável','owner_id','Responsável interno pela empresa.','relation','company','CRM',true,false,true,'owner_id',false,80),
    (p_company_id,'Logradouro','street','Rua, avenida ou logradouro.','text','company','Endereço',false,false,true,'street',false,90),
    (p_company_id,'Número','address_number','Número do endereço.','text','company','Endereço',false,false,true,'address_number',false,100),
    (p_company_id,'Complemento','complement','Complemento do endereço.','text','company','Endereço',false,false,true,'complement',false,110),
    (p_company_id,'Bairro','neighborhood','Bairro.','text','company','Endereço',false,false,true,'neighborhood',false,120),
    (p_company_id,'Cidade','city','Cidade.','text','company','Endereço',false,false,true,'city',false,130),
    (p_company_id,'Estado / UF','state','Estado ou UF.','text','company','Endereço',false,false,true,'state',false,140),
    (p_company_id,'CEP','postal_code','CEP da empresa.','text','company','Endereço',false,false,true,'postal_code',false,150),
    (p_company_id,'Criada em','created_at','Data de criação da empresa no CRM.','datetime','company','Sistema',false,false,true,'created_at',false,160),
    (p_company_id,'Atualizada em','updated_at','Data da última atualização da empresa.','datetime','company','Sistema',false,false,true,'updated_at',false,170),

    -- NEGÓCIO
    (p_company_id,'Nome do negócio','title','Título principal do negócio.','text','deal','Dados do Negócio',true,false,true,'title',true,10),
    (p_company_id,'Lead / Pessoa','lead_id','Pessoa principal vinculada ao negócio.','relation','deal','Vínculos',true,false,true,'lead_id',true,20),
    (p_company_id,'Empresa','company','Empresa do CRM vinculada ao negócio.','relation','deal','Vínculos',true,false,true,'crm_company_id',false,30),
    (p_company_id,'Pipeline','pipeline_id','Pipeline atual do negócio.','relation','deal','Pipeline',true,false,true,'pipeline_id',false,40),
    (p_company_id,'Etapa','stage_id','Etapa atual da pipeline.','relation','deal','Pipeline',true,false,true,'stage_id',false,50),
    (p_company_id,'Valor','value','Valor financeiro do negócio.','currency','deal','Dados do Negócio',true,false,true,'value',false,60),
    (p_company_id,'Moeda','currency','Moeda utilizada no negócio.','text','deal','Dados do Negócio',false,false,true,'currency',false,70),
    (p_company_id,'Status','status','Status atual do negócio.','select','deal','Pipeline',true,false,true,'status',false,80),
    (p_company_id,'Responsável','owner_id','Responsável pelo negócio.','relation','deal','CRM',true,false,true,'owner_id',false,90),
    (p_company_id,'Prioridade','priority','Prioridade comercial do negócio.','select','deal','CRM',true,false,true,'priority',false,100),
    (p_company_id,'Probabilidade','probability','Probabilidade estimada de fechamento.','number','deal','CRM',true,false,true,'probability',false,110),
    (p_company_id,'Previsão de fechamento','expected_close_date','Data prevista de fechamento.','date','deal','CRM',true,false,true,'expected_close_date',false,120),
    (p_company_id,'Descrição','description','Descrição e contexto do negócio.','textarea','deal','Dados do Negócio',false,false,true,'description',false,130),
    (p_company_id,'Última atividade','last_activity_at','Data/hora da última atividade do negócio.','datetime','deal','Atividade',false,false,true,'last_activity_at',false,140),
    (p_company_id,'Próxima atividade','next_activity_at','Data/hora da próxima atividade.','datetime','deal','Atividade',true,false,true,'next_activity_at',false,150),
    (p_company_id,'Ganho em','won_at','Data/hora em que o negócio foi ganho.','datetime','deal','Fechamento',false,false,true,'won_at',false,160),
    (p_company_id,'Perdido em','lost_at','Data/hora em que o negócio foi perdido.','datetime','deal','Fechamento',false,false,true,'lost_at',false,170),
    (p_company_id,'Motivo de perda','lost_reason_id','Motivo associado à perda do negócio.','relation','deal','Fechamento',true,false,true,'lost_reason_id',false,180),
    (p_company_id,'Criado em','created_at','Data de criação do negócio.','datetime','deal','Sistema',false,false,true,'created_at',false,190),
    (p_company_id,'Atualizado em','updated_at','Data da última atualização do negócio.','datetime','deal','Sistema',false,false,true,'updated_at',false,200)
  ON CONFLICT (company_id, category, key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    type = EXCLUDED.type,
    group_name = EXCLUDED.group_name,
    is_system = true,
    source_column = EXCLUDED.source_column,
    is_required = EXCLUDED.is_required,
    order_index = EXCLUDED.order_index;
END;
$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_crm_system_fields(r.id);
  END LOOP;
END;
$$;
