-- ========================================================
-- MIGRATION: CENTRAL AGÊNTICA DA QUALIFY (OpenAI + LangChain + LangGraph)
-- Infraestrutura Agêntica Reutilizável Multi-Tenant
-- ========================================================

-- 1. MODEL PROFILES: Garantir FAST_CLASSIFIER e outros perfis
INSERT INTO public.ai_model_profiles (code, name, description, provider, model, reasoning_effort, max_output_tokens, temperature, timeout_seconds, is_active)
VALUES
  ('FAST_CLASSIFIER', 'Fast Classifier (GPT-4o Mini)', 'Classificador ultrarrápido para roteamento, extração de entidades e checagens lógicas.', 'openai', 'gpt-4o-mini', NULL, 1000, 0.20, 20, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature;

-- 2. TABELA: AI_AGENTS (Registro de Agentes)
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'draft'
  model_profile TEXT NOT NULL DEFAULT 'CONTENT_STANDARD' REFERENCES public.ai_model_profiles(code) ON UPDATE CASCADE,
  system_prompt TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  tools TEXT[] NOT NULL DEFAULT '{}',
  context_providers TEXT[] NOT NULL DEFAULT '{}',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA: AI_TOOLS (Registro de Tools)
CREATE TABLE IF NOT EXISTS public.ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- ex: 'ai.score_hook', 'crm.get_lead'
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'read_only', -- 'read_only', 'write_internal', 'write_external', 'critical'
  permission TEXT NOT NULL DEFAULT 'ai.use_tools',
  handler TEXT NOT NULL,
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeout INTEGER NOT NULL DEFAULT 30,
  retry_policy JSONB NOT NULL DEFAULT '{"max_retries": 3, "backoff": "exponential"}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA: AI_WORKFLOWS (Registro de Workflows LangGraph)
CREATE TABLE IF NOT EXISTS public.ai_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- ex: 'create_strategic_reel'
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'draft'
  graph_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  entry_point TEXT NOT NULL DEFAULT 'Load Context',
  loop_guards JSONB NOT NULL DEFAULT '{"max_agent_steps": 10, "max_tool_calls": 20, "max_retries": 3, "max_execution_time": 120, "max_cost": 5.0}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA: AI_CONTEXT_PROVIDERS (Registro de Provedores de Contexto)
CREATE TABLE IF NOT EXISTS public.ai_context_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- ex: 'brand_manual', 'account_strategy'
  name TEXT NOT NULL,
  description TEXT,
  handler TEXT NOT NULL,
  cache_ttl_seconds INTEGER NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ATUALIZAR TABELA AI_SKILLS COM CAMPOS EXTRAS CASO NÃO EXISTAM
ALTER TABLE public.ai_skills 
  ADD COLUMN IF NOT EXISTS required_tools TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "references" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 7. ATUALIZAR TABELA AI_EXECUTIONS COM CAMPOS DE RASTREABILIDADE LANGGRAPH / LANGCHAIN
ALTER TABLE public.ai_executions
  ADD COLUMN IF NOT EXISTS agent_slug TEXT,
  ADD COLUMN IF NOT EXISTS agent_version INTEGER,
  ADD COLUMN IF NOT EXISTS workflow_slug TEXT,
  ADD COLUMN IF NOT EXISTS workflow_version INTEGER,
  ADD COLUMN IF NOT EXISTS tool_calls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approvals JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS checkpoint JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trace JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ DEFAULT now();

-- HABILITAR RLS NAS NOVAS TABELAS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context_providers ENABLE ROW LEVEL SECURITY;

-- POLICIES DE LEITURA (AUTHENTICATED) E ESCRITA (SUPERADMIN)
CREATE POLICY "ai_agents_select_auth" ON public.ai_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_agents_all_superadmin" ON public.ai_agents FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "ai_tools_select_auth" ON public.ai_tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_tools_all_superadmin" ON public.ai_tools FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "ai_workflows_select_auth" ON public.ai_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_workflows_all_superadmin" ON public.ai_workflows FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "ai_context_providers_select_auth" ON public.ai_context_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_context_providers_all_superadmin" ON public.ai_context_providers FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- ========================================================
-- SEED DOS COMPONENTES AGÊNTICOS INICIAIS
-- ========================================================

-- Tools Iniciais
INSERT INTO public.ai_tools (name, description, type, permission, handler, input_schema, output_schema)
VALUES
  ('ai.score_hook', 'Avalia ganchos de vídeo com base em fórmulas de retenção, contagem de palavras e impacto nos primeiros 3s.', 'read_only', 'ai.use_tools', 'score_hook', '{"type": "object", "properties": {"hooks": {"type": "array", "items": {"type": "string"}}}}'::jsonb, '{"type": "object"}'::jsonb),
  ('ai.generate_beat_sheet', 'Gera folha de tempo de gravação (beat sheet) por blocos a ~165 WPM.', 'read_only', 'ai.use_tools', 'generate_beat_sheet', '{"type": "object", "properties": {"script": {"type": "string"}, "wpm": {"type": "number"}}}'::jsonb, '{"type": "object"}'::jsonb),
  ('company.get_brand_manual', 'Recupera o manual de marca, tom de voz, personas e pilares da empresa.', 'read_only', 'company.read', 'get_brand_manual', '{"type": "object", "properties": {"company_id": {"type": "string"}}}'::jsonb, '{"type": "object"}'::jsonb),
  ('criafy.save_content', 'Salva roteiro ou publicação aprovada na biblioteca da Criafy.', 'write_internal', 'criafy.write', 'save_content', '{"type": "object", "properties": {"title": {"type": "string"}, "script": {"type": "string"}}}'::jsonb, '{"type": "object"}'::jsonb),
  ('criafy.create_demand', 'Cria uma demanda de design/gravação vinculada ao conteúdo no Kanban.', 'write_internal', 'criafy.write', 'create_demand', '{"type": "object", "properties": {"title": {"type": "string"}}}'::jsonb, '{"type": "object"}'::jsonb),
  ('instagram.get_metrics', 'Retorna métricas históricas de alcance e engajamento da conta do Instagram.', 'read_only', 'instagram.read', 'get_instagram_metrics', '{"type": "object"}'::jsonb, '{"type": "object"}'::jsonb),
  ('crm.get_lead', 'Consulta dados e histórico de um lead do CRM.', 'read_only', 'crm.read', 'crm_get_lead', '{"type": "object", "properties": {"lead_id": {"type": "string"}}}'::jsonb, '{"type": "object"}'::jsonb),
  ('crm.move_lead', 'Move um lead para uma nova etapa do funil do CRM.', 'write_internal', 'crm.write', 'crm_move_lead', '{"type": "object", "properties": {"lead_id": {"type": "string"}, "stage_id": {"type": "string"}}}'::jsonb, '{"type": "object"}'::jsonb),
  ('crm.create_note', 'Adiciona uma nota interna à ficha de um lead.', 'write_internal', 'crm.write', 'crm_create_note', '{"type": "object", "properties": {"lead_id": {"type": "string"}, "note": {"type": "string"}}}'::jsonb, '{"type": "object"}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  permission = EXCLUDED.permission,
  handler = EXCLUDED.handler;

-- Context Providers Iniciais
INSERT INTO public.ai_context_providers (slug, name, description, handler)
VALUES
  ('company', 'Dados da Empresa', 'Informações cadastrais, segmento e plano.', 'company'),
  ('brand_manual', 'Manual de Marca', 'Diretrizes de posicionamento, tom de voz e personas.', 'brand_manual'),
  ('instagram_account', 'Conta Instagram', 'Dados do perfil conectado, nicho e @handle.', 'instagram_account'),
  ('account_strategy', 'Estratégia Editorial', 'Pilares de conteúdo, temas prioritários e público-alvo.', 'account_strategy'),
  ('content_history', 'Histórico de Conteúdo', 'Últimas publicações e performance de engajamento.', 'content_history'),
  ('campaign', 'Campanhas Ativas', 'Briefings de campanhas vigentes.', 'campaign'),
  ('crm_lead', 'Lead do CRM', 'Ficha completa do lead e estágio do pipeline.', 'crm_lead'),
  ('sales_history', 'Histórico Comercial', 'Negociações anteriores e histórico de compras.', 'sales_history'),
  ('user', 'Usuário Operador', 'Dados do usuário autenticado disparando a ação.', 'user')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Skill Inicial: ig-reel
INSERT INTO public.ai_skills (slug, name, description, category, when_to_use, target_objective, main_instructions, output_format, default_model_profile, status, required_tools, version)
VALUES
  ('ig-reel', 'Roteiro Estratégico de Reel (ig-reel)', 'Criação de roteiros curtos de alta retenção com 3 opções de ganchos validados, beat sheet estruturado e CTA estratégico.', 'CONTEÚDO', 'Quando for gravar Reels informativos, diretos ou narrativos de até 60 segundos.', 'Máxima retenção nos primeiros 3 segundos e taxa de conclusão elevada.', 'Aplique as fórmulas validadas de ganchos comprovados. Nunca crie introduções lentas. Conecte o hook com a resolução em até 10 segundos. Desenvolva beat sheet calculando ritmo a 165 palavras por minuto. Finalize com chamada de ação concisa e loop de retorno.', 'json', 'CONTENT_STANDARD', 'published', ARRAY['ai.score_hook', 'ai.generate_beat_sheet', 'company.get_brand_manual', 'criafy.save_content'], 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required_tools = EXCLUDED.required_tools;

-- Agent Inicial: InstagramAgent
INSERT INTO public.ai_agents (slug, name, description, status, model_profile, system_prompt, skills, tools, context_providers, permissions, version)
VALUES
  ('InstagramAgent', 'Instagram Agent', 'Especialista em estratégia, copywriting e roteirização para crescimento e autoridade no Instagram.', 'active', 'CONTENT_STANDARD', 'Você é o InstagramAgent da Qualify, um estrategista sênior de redes sociais focado em retenção, posicionamento de autoridade e conversão qualificada. Você produz roteiros de Reels, planeja carrosséis e analisa a performance editorial sem clichês ou promessas vazias.', ARRAY['ig-reel'], ARRAY['ai.score_hook', 'ai.generate_beat_sheet', 'company.get_brand_manual', 'criafy.save_content', 'criafy.create_demand', 'instagram.get_metrics'], ARRAY['brand_manual', 'account_strategy', 'content_history'], ARRAY['criafy.read', 'criafy.write', 'ai.use_tools'], 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  skills = EXCLUDED.skills,
  tools = EXCLUDED.tools,
  context_providers = EXCLUDED.context_providers;

-- Workflow Inicial: create_strategic_reel (LangGraph)
INSERT INTO public.ai_workflows (slug, name, description, version, status, entry_point, loop_guards, graph_definition)
VALUES
  ('create_strategic_reel', 'Criar Reel Estratégico', 'Orquestração LangGraph completa: Coleta de contexto -> Geração de 3 Hooks -> Pontuação com score_hook -> Seleção do Campeão -> Roteirização -> Beat Sheet -> Validação com ciclo de reescrita -> Salvamento.', 1, 'active', 'Load Context', '{"max_agent_steps": 10, "max_tool_calls": 20, "max_retries": 3, "max_execution_time": 120, "max_cost": 2.0}'::jsonb, '{"nodes": ["Load Context", "Generate Hooks", "Score Hooks", "Select Hook", "Write Script", "Generate Beat Sheet", "Validate", "Rewrite", "Save Content"], "conditional_edges": [{"source": "Validate", "condition": "is_valid", "targets": {"true": "Save Content", "false": "Rewrite"}}]}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  graph_definition = EXCLUDED.graph_definition;
