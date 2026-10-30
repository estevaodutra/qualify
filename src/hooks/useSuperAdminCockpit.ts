import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AIExecutionService } from "@/services/ai/aiExecutionService";

export interface SuperAdminAlert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  actionUrl: string;
  actionLabel: string;
}

export interface SuperAdminCockpitData {
  kpis: {
    activeCompanies: number;
    activeUsers: number;
    newCompanies30d: number;
    newUsers24h: number;
    aiUsageTodayTokens: number;
    aiUsage30dTokens: number;
    aiCostTodayUsd: number;
    aiCost30dUsd: number;
    failedAiExecutions: number;
    queuedJobs: number;
    integrationsWithError: number;
  };
  alerts: SuperAdminAlert[];
  recentCompanies: Array<{
    id: string;
    name: string;
    created_at: string;
    is_active: boolean;
    owner_email?: string;
  }>;
  recentExecutions: any[];
}

export function useSuperAdminCockpit() {
  return useQuery<SuperAdminCockpitData>({
    queryKey: ["superadmin", "cockpit"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const sb = supabase as any;
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // 1. Buscas paralelas no Supabase
      const [
        companiesRes,
        newCompaniesRes,
        profilesRes,
        newUsersRes,
        walletsRes,
        instancesRes,
        callQueueRes,
        metaAccountsRes,
        aiStats,
      ] = await Promise.all([
        sb.from("companies").select("id, name, is_active, created_at, is_deleted, owner_id").order("created_at", { ascending: false }),
        sb.from("companies").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
        sb.from("profiles").select("id", { count: "exact", head: true }),
        sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
        sb.from("wallets").select("company_id, balance"),
        sb.from("instances").select("id, name, status, payment_status, company_id"),
        sb.from("call_queue").select("id", { count: "exact", head: true }),
        sb.from("criafy_instagram_accounts").select("id, username, is_active, status"),
        AIExecutionService.getStats().catch(() => null),
      ]);

      const companies = (companiesRes.data || []).filter((c: any) => !c.is_deleted);
      const activeCompanies = companies.filter((c: any) => c.is_active).length;
      const totalUsers = profilesRes.count ?? 0;
      const newCompanies30d = newCompaniesRes.count ?? 0;
      const newUsers24h = newUsersRes.count ?? 0;

      // Instâncias de WhatsApp com erro
      const instances = instancesRes.data || [];
      const errorInstances = instances.filter(
        (i: any) => i.status === "error" || i.status === "disconnected" || i.status === "critical"
      );

      // Contas Meta com erro
      const metaAccounts = metaAccountsRes.data || [];
      const errorMetaAccounts = metaAccounts.filter(
        (m: any) => m.is_active === false || m.status === "error" || m.status === "expired"
      );

      // Empresas sem saldo ou com saldo negativo
      const wallets = walletsRes.data || [];
      const zeroBalanceCompanies = wallets.filter((w: any) => Number(w.balance) <= 0);

      // Filas & Jobs
      const queuedJobsCount = callQueueRes.count ?? 0;

      // Execuções IA com erro
      const failedAiExecutions = aiStats?.errorRate
        ? Math.round(((aiStats.executions7d || 0) * (aiStats.errorRate || 0)) / 100)
        : 0;

      // Integrações com erro total
      const integrationsWithError = errorInstances.length + errorMetaAccounts.length;

      // Montagem de alertas operacionais reais
      const alerts: SuperAdminAlert[] = [];

      if (zeroBalanceCompanies.length > 0) {
        alerts.push({
          id: "alert-low-balance",
          type: "warning",
          title: "Empresas com saldo zerado",
          description: `${zeroBalanceCompanies.length} empresas atingiram o limite de crédito ou estão sem saldo.`,
          actionUrl: "/admin/empresas?balance=without",
          actionLabel: "Ver empresas",
        });
      }

      if (errorInstances.length > 0) {
        alerts.push({
          id: "alert-whatsapp-down",
          type: "critical",
          title: "Instâncias de WhatsApp desconectadas",
          description: `${errorInstances.length} instâncias reportaram falha na conexão ou desconexão do aparelho.`,
          actionUrl: "/admin/integracoes/whatsapp?status=disconnected",
          actionLabel: "Gerenciar WhatsApp",
        });
      }

      if (errorMetaAccounts.length > 0) {
        alerts.push({
          id: "alert-meta-expired",
          type: "warning",
          title: "Contas Meta / Instagram com token expirado",
          description: `${errorMetaAccounts.length} contas precisam de reconexão do token de publicação.`,
          actionUrl: "/admin/integracoes/meta",
          actionLabel: "Verificar contas",
        });
      }

      if (failedAiExecutions > 0) {
        alerts.push({
          id: "alert-ai-failures",
          type: "warning",
          title: "Execuções de IA com falha",
          description: `Taxa de erro de ${aiStats?.errorRate?.toFixed(1) || 0}% nas últimas execuções de Skills.`,
          actionUrl: "/admin/ia/execucoes?status=FAILED",
          actionLabel: "Ver logs de IA",
        });
      }

      if (queuedJobsCount > 100) {
        alerts.push({
          id: "alert-queue-congested",
          type: "info",
          title: "Fila de processamento acumulada",
          description: `${queuedJobsCount} itens aguardando execução na fila de discagem/disparos.`,
          actionUrl: "/admin/sistema/jobs",
          actionLabel: "Ver filas",
        });
      }

      // Empresas recentes
      const recentCompanies = companies.slice(0, 6).map((c: any) => ({
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        is_active: c.is_active,
        owner_email: c.owner_email,
      }));

      // Execuções recentes
      let recentExecutions: any[] = [];
      try {
        const execsData = await AIExecutionService.getExecutions({ limit: 5 });
        recentExecutions = execsData?.executions || [];
      } catch (err) {
        console.warn("Falha ao carregar execuções de IA recentes:", err);
      }

      return {
        kpis: {
          activeCompanies,
          activeUsers: totalUsers,
          newCompanies30d,
          newUsers24h,
          aiUsageTodayTokens: aiStats?.tokensToday || 0,
          aiUsage30dTokens: aiStats?.tokens7d ? aiStats.tokens7d * 4 : 0, // estimativa de tokens 30d se não houver agregação mensal
          aiCostTodayUsd: aiStats?.costToday || 0,
          aiCost30dUsd: aiStats?.cost7d ? aiStats.cost7d * 4 : 0,
          failedAiExecutions,
          queuedJobs: queuedJobsCount,
          integrationsWithError,
        },
        alerts,
        recentCompanies,
        recentExecutions,
      };
    },
  });
}
