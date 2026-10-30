import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminCompany } from "./useAdmin";

export interface CompanyDetailViewData {
  company: {
    id: string;
    name: string;
    owner_id: string;
    is_active: boolean;
    created_at: string;
    status?: string;
  };
  owner?: {
    id: string;
    email: string;
    full_name?: string;
  };
  wallet?: {
    balance: number;
    reserved_balance: number;
  };
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    joined_at: string;
    email?: string;
    full_name?: string;
  }>;
  plan: {
    name: string;
    status: string;
    started_at: string;
    dispatches_limit: number;
    instances_limit: number;
    campaigns_limit: number;
  };
  stats: {
    rechargedTotal: number;
    consumedTotal: number;
    lastDepositAt?: string;
    connectedAccountsCount: number;
    aiExecutionsCount: number;
    aiTokensTotal: number;
    aiCostEstimatedUsd: number;
    recentErrorsCount: number;
  };
  instances: Array<{
    id: string;
    name: string;
    phone: string;
    status: string;
    created_at: string;
  }>;
  metaAccounts: Array<{
    id: string;
    username: string;
    status: string;
    is_active: boolean;
  }>;
  recentAiExecutions: Array<{
    id: string;
    action: string;
    skill_name?: string;
    status: string;
    model: string;
    total_tokens: number;
    created_at: string;
  }>;
  recentLogs: Array<{
    id: string;
    type: string;
    status: string;
    created_at: string;
    error_message?: string;
  }>;
}

export function useAdminCompanyDetailView(companyId: string | undefined | null) {
  return useQuery<CompanyDetailViewData>({
    queryKey: ["admin", "company-detail-view", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) throw new Error("ID da empresa inválido");
      const sb = supabase as any;

      const [
        companyRes,
        walletRes,
        membersRes,
        txRes,
        instancesRes,
        metaAccountsRes,
        aiExecsRes,
      ] = await Promise.all([
        sb.from("companies").select("*").eq("id", companyId).single(),
        sb.from("wallets").select("*").eq("company_id", companyId).maybeSingle(),
        sb.from("company_members").select("*").eq("company_id", companyId),
        sb.from("wallet_transactions").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
        sb.from("instances").select("id, name, phone, status, created_at").eq("company_id", companyId),
        sb.from("criafy_instagram_accounts").select("id, username, status, is_active").eq("company_id", companyId).catch(() => ({ data: [] })),
        sb.from("ai_executions").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(20).catch(() => ({ data: [] })),
      ]);

      if (companyRes.error) throw companyRes.error;
      const company = companyRes.data;

      // Owner profile
      const ownerRes = await sb.from("profiles").select("id, email, full_name").eq("id", company.owner_id).maybeSingle();

      // Members profiles
      const memberUserIds = (membersRes.data || []).map((m: any) => m.user_id);
      const profilesRes = memberUserIds.length > 0
        ? await sb.from("profiles").select("id, email, full_name").in("id", memberUserIds)
        : { data: [] };
      const pMap = new Map<string, any>((profilesRes.data || []).map((p: any) => [p.id, p]));

      const members = (membersRes.data || []).map((m: any) => ({
        ...m,
        email: pMap.get(m.user_id)?.email,
        full_name: pMap.get(m.user_id)?.full_name,
      }));

      // Totais financeiros
      let rechargedTotal = 0;
      let consumedTotal = 0;
      let lastDepositAt: string | undefined = undefined;

      (txRes.data || []).forEach((t: any) => {
        const amt = Math.abs(Number(t.amount || 0));
        if (t.type === "deposit" || t.type === "adjustment") {
          rechargedTotal += amt;
          if (!lastDepositAt) lastDepositAt = t.created_at;
        } else if (t.type === "consumption") {
          consumedTotal += amt;
        }
      });

      // AI Stats
      const aiExecs = aiExecsRes.data || [];
      const aiTokensTotal = aiExecs.reduce((sum: number, e: any) => sum + Number(e.total_tokens || 0), 0);
      const aiCostEstimatedUsd = aiExecs.reduce((sum: number, e: any) => sum + Number(e.estimated_cost || 0), 0);
      const failedExecs = aiExecs.filter((e: any) => e.status === "FAILED");

      // Instâncias & Meta
      const instances = instancesRes.data || [];
      const metaAccounts = metaAccountsRes.data || [];

      return {
        company,
        owner: ownerRes.data || undefined,
        wallet: {
          balance: Number(walletRes.data?.balance || 0),
          reserved_balance: Number(walletRes.data?.reserved_balance || 0),
        },
        members,
        plan: {
          name: "Plano Standard (Pré-pago)",
          status: company.is_active ? "Ativo" : "Suspenso",
          started_at: company.created_at,
          dispatches_limit: 10000,
          instances_limit: 5,
          campaigns_limit: 10,
        },
        stats: {
          rechargedTotal,
          consumedTotal,
          lastDepositAt,
          connectedAccountsCount: instances.length + metaAccounts.length,
          aiExecutionsCount: aiExecs.length,
          aiTokensTotal,
          aiCostEstimatedUsd,
          recentErrorsCount: failedExecs.length,
        },
        instances,
        metaAccounts,
        recentAiExecutions: aiExecs,
        recentLogs: [],
      };
    },
  });
}
