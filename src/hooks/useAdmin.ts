import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ============================================================
// Companies
// ============================================================
export interface AdminCompany {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
  // joined
  balance?: number;
  reserved_balance?: number;
  member_count?: number;
  owner_email?: string;
  month_consumption?: number;
}

export function useAdminCompanies() {
  return useQuery({
    queryKey: ["admin", "companies"],
    queryFn: async () => {
      const sb = supabase as any;
      const { data: companies, error } = await sb
        .from("companies")
        .select("id, name, owner_id, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!companies?.length) return [] as AdminCompany[];

      const ids = companies.map((c: any) => c.id);
      const ownerIds = [...new Set(companies.map((c: any) => c.owner_id))];

      const [walletsRes, membersRes, ownersRes, txRes] = await Promise.all([
        sb.from("wallets").select("company_id, balance, reserved_balance").in("company_id", ids),
        sb.from("company_members").select("company_id").in("company_id", ids).eq("is_active", true),
        sb.from("profiles").select("id, email, full_name").in("id", ownerIds),
        sb
          .from("wallet_transactions")
          .select("company_id, amount, type, created_at")
          .in("company_id", ids)
          .eq("type", "consumption")
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      const wMap = new Map<string, any>((walletsRes.data || []).map((w: any) => [w.company_id, w]));
      const oMap = new Map<string, any>((ownersRes.data || []).map((o: any) => [o.id, o]));
      const memberCounts = new Map<string, number>();
      (membersRes.data || []).forEach((m: any) => {
        memberCounts.set(m.company_id, (memberCounts.get(m.company_id) || 0) + 1);
      });
      const consumptionMap = new Map<string, number>();
      (txRes.data || []).forEach((t: any) => {
        consumptionMap.set(t.company_id, (consumptionMap.get(t.company_id) || 0) + Math.abs(Number(t.amount)));
      });

      return companies.map((c: any) => ({
        ...c,
        balance: Number(wMap.get(c.id)?.balance ?? 0),
        reserved_balance: Number(wMap.get(c.id)?.reserved_balance ?? 0),
        member_count: memberCounts.get(c.id) || 0,
        owner_email: oMap.get(c.owner_id)?.email,
        month_consumption: consumptionMap.get(c.id) || 0,
      })) as AdminCompany[];
    },
  });
}

export function useAdminCompanyDetails(companyId: string | null) {
  return useQuery({
    queryKey: ["admin", "company", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const sb = supabase as any;
      const [companyRes, walletRes, membersRes, txAggRes, lastDepositRes] = await Promise.all([
        sb.from("companies").select("*").eq("id", companyId).single(),
        sb.from("wallets").select("*").eq("company_id", companyId).maybeSingle(),
        sb
          .from("company_members")
          .select("id, user_id, role, is_active, joined_at")
          .eq("company_id", companyId),
        sb
          .from("wallet_transactions")
          .select("type, amount")
          .eq("company_id", companyId),
        sb
          .from("wallet_transactions")
          .select("created_at, amount")
          .eq("company_id", companyId)
          .eq("type", "deposit")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const memberIds = (membersRes.data || []).map((m: any) => m.user_id);
      const profilesRes = memberIds.length
        ? await sb.from("profiles").select("id, email, full_name").in("id", memberIds)
        : { data: [] };
      const pMap = new Map<string, any>((profilesRes.data || []).map((p: any) => [p.id, p]));

      const totals = { recharged: 0, consumed: 0 };
      (txAggRes.data || []).forEach((t: any) => {
        const amt = Number(t.amount);
        if (t.type === "deposit" || t.type === "adjustment") {
          if (amt > 0) totals.recharged += amt;
        } else if (t.type === "consumption") {
          totals.consumed += Math.abs(amt);
        }
      });

      return {
        company: companyRes.data,
        wallet: walletRes.data,
        members: (membersRes.data || []).map((m: any) => ({
          ...m,
          email: pMap.get(m.user_id)?.email,
          full_name: pMap.get(m.user_id)?.full_name,
        })),
        totals,
        lastDepositAt: lastDepositRes.data?.[0]?.created_at,
      };
    },
  });
}

export function useToggleCompanyActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("companies")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "companies"] });
      toast({ title: vars.is_active ? "Empresa ativada" : "Empresa desativada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useCreditManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      company_id: string;
      amount: number;
      reason: string;
      description?: string;
    }) => {
      const { data, error } = await (supabase as any).rpc("wallet_credit_manual", {
        p_company_id: params.company_id,
        p_amount: params.amount,
        p_reason: params.reason,
        p_description: params.description ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Saldo creditado com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ============================================================
// Users
// ============================================================
export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_superadmin: boolean;
  company_count: number;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const sb = supabase as any;
      const [profilesRes, rolesRes, membersRes] = await Promise.all([
        sb.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
        sb.from("user_roles").select("user_id, role"),
        sb.from("company_members").select("user_id").eq("is_active", true),
      ]);

      const superSet = new Set(
        (rolesRes.data || []).filter((r: any) => r.role === "superadmin").map((r: any) => r.user_id),
      );
      const memberCounts = new Map<string, number>();
      (membersRes.data || []).forEach((m: any) => {
        memberCounts.set(m.user_id, (memberCounts.get(m.user_id) || 0) + 1);
      });

      return (profilesRes.data || []).map((p: any) => ({
        ...p,
        is_superadmin: superSet.has(p.id),
        company_count: memberCounts.get(p.id) || 0,
      })) as AdminUser[];
    },
  });
}

export function useToggleSuperadmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, make }: { user_id: string; make: boolean }) => {
      const sb = supabase as any;
      if (make) {
        const { error } = await sb
          .from("user_roles")
          .insert({ user_id, role: "superadmin" });
        if (error && !error.message?.includes("duplicate")) throw error;
      } else {
        const { error } = await sb
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", "superadmin");
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: v.make ? "Promovido a superadmin" : "Removido de superadmin" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ============================================================
// Dashboard metrics
// ============================================================
export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const sb = supabase as any;
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const dayMs = 24 * 60 * 60 * 1000;
      const since30 = new Date(Date.now() - 30 * dayMs).toISOString();

      const [companiesRes, profilesRes, walletsRes, txMonthRes, recentRes, txDailyRes, lowWalletsRes, awaitRes] =
        await Promise.all([
          sb.from("companies").select("id, is_active", { count: "exact", head: false }),
          sb.from("profiles").select("id", { count: "exact", head: true }),
          sb.from("wallets").select("balance"),
          sb.from("wallet_transactions").select("type, amount").gte("created_at", monthStart),
          sb
            .from("companies")
            .select("id, name, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          sb
            .from("wallet_transactions")
            .select("type, amount, created_at")
            .gte("created_at", since30),
          sb.from("wallets").select("company_id, balance").lt("balance", 50),
          sb.from("profiles").select("id"),
        ]);

      const totalCompanies = companiesRes.data?.length ?? 0;
      const totalUsers = profilesRes.count ?? 0;
      const totalBalance = (walletsRes.data || []).reduce((s: number, w: any) => s + Number(w.balance), 0);

      let monthRevenue = 0;
      let monthConsumption = 0;
      (txMonthRes.data || []).forEach((t: any) => {
        const a = Number(t.amount);
        if (t.type === "deposit" && a > 0) monthRevenue += a;
        if (t.type === "consumption") monthConsumption += Math.abs(a);
      });

      // Daily series
      const series: Record<string, { date: string; revenue: number; consumption: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * dayMs);
        const k = d.toISOString().slice(0, 10);
        series[k] = { date: k, revenue: 0, consumption: 0 };
      }
      (txDailyRes.data || []).forEach((t: any) => {
        const k = (t.created_at as string).slice(0, 10);
        if (!series[k]) return;
        const a = Number(t.amount);
        if (t.type === "deposit" && a > 0) series[k].revenue += a;
        if (t.type === "consumption") series[k].consumption += Math.abs(a);
      });

      // Awaiting access = profiles with no active membership
      const sb2 = supabase as any;
      const memRes = await sb2.from("company_members").select("user_id").eq("is_active", true);
      const memSet = new Set((memRes.data || []).map((m: any) => m.user_id));
      const awaiting = (awaitRes.data || []).filter((p: any) => !memSet.has(p.id)).length;

      return {
        totals: {
          companies: totalCompanies,
          users: totalUsers,
          balance: totalBalance,
          monthRevenue,
          monthConsumption,
          monthProfit: monthRevenue - monthConsumption,
        },
        recentCompanies: recentRes.data || [],
        series: Object.values(series),
        alerts: {
          lowBalanceCount: (lowWalletsRes.data || []).length,
          awaitingAccessCount: awaiting,
        },
      };
    },
  });
}

// ============================================================
// Transactions / Recharges / Consumption
// ============================================================
export interface TxFilters {
  from?: string;
  to?: string;
  company_id?: string;
  type?: string;
  category?: string;
}

export function useAdminTransactions(filters: TxFilters) {
  return useQuery({
    queryKey: ["admin", "transactions", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, 499);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);
      if (filters.company_id) q = q.eq("company_id", filters.company_id);
      if (filters.type && filters.type !== "all") q = q.eq("type", filters.type);
      if (filters.category && filters.category !== "all") q = q.eq("category", filters.category);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAdminRecharges(filters: { from?: string; to?: string; status?: string }) {
  return useQuery({
    queryKey: ["admin", "recharges", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("wallet_payments")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, 499);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

// ============================================================
// Pricing rules
// ============================================================
export function usePricingRules() {
  return useQuery({
    queryKey: ["admin", "pricing"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pricing_rules")
        .select("*")
        .order("company_id", { nullsFirst: true })
        .order("action_type")
        .order("valid_from", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertPricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: any) => {
      const sb = supabase as any;
      if (rule.id) {
        const { error } = await sb.from("pricing_rules").update(rule).eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("pricing_rules").insert(rule);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pricing"] });
      toast({ title: "Preço salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("pricing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pricing"] });
      toast({ title: "Preço removido" });
    },
  });
}

// ============================================================
// Platform settings
// ============================================================
export function usePlatformSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("platform_settings").select("*");
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((s: any) => (map[s.key] = s.value));
      return map;
    },
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await (supabase as any)
        .from("platform_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast({ title: "Configuração salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
