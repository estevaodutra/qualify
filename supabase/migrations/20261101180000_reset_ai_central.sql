-- ==============================================================================
-- LIMPEZA TOTAL DA CENTRAL DE IA (RESET AO MARCO ZERO)
-- Remove todos os agentes, skills, tools, workflows e provedores de contexto
-- permitindo recriar tudo com arquitetura limpa, fiel e individualizada.
-- ==============================================================================

DELETE FROM public.ai_skill_versions;
DELETE FROM public.ai_skills;
DELETE FROM public.ai_agents;
DELETE FROM public.ai_tools;
DELETE FROM public.ai_workflows;
DELETE FROM public.ai_context_providers;
