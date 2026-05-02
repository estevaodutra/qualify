import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface Wallet {
  id: string;
  company_id: string;
  balance: number;
  reserved_balance: number;
  low_balance_alert: number | null;
  alert_email_enabled: boolean;
  alert_in_app_enabled: boolean;
  daily_limit: number | null;
  daily_limit_action: string;
  daily_spent: number;
  daily_spent_date: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  company_id: string;
  type: string;
  category: string | null;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  metadata: any;
  reference_type: string | null;
  reference_id: string | null;
  status: string;
  created_at: string;
}

export interface WalletPayment {
  id: string;
  amount: number;
  status: string;
  mp_qr_code: string | null;
  mp_qr_code_base64: string | null;
  mp_ticket_url: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export function useWallet() {
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ["wallet", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wallets")
        .select("*")
        .eq("company_id", activeCompanyId)
        .maybeSingle();
      if (error) throw error;
      return data as Wallet | null;
    },
  });

  // Realtime: refresh wallet when balance changes
  useEffect(() => {
    if (!activeCompanyId) return;
    const channel = supabase
      .channel(`wallet:${activeCompanyId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `company_id=eq.${activeCompanyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["wallet", activeCompanyId] });
          qc.invalidateQueries({ queryKey: ["wallet-transactions", activeCompanyId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeCompanyId, qc]);

  return walletQuery;
}

export function useWalletTransactions(opts?: { limit?: number; types?: string[]; from?: string; to?: string }) {
  const { activeCompanyId } = useCompany();
  const limit = opts?.limit ?? 5;
  return useQuery({
    queryKey: ["wallet-transactions", activeCompanyId, limit, opts?.types, opts?.from, opts?.to],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = (supabase as any)
        .from("wallet_transactions")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .range(0, limit - 1);
      if (opts?.types?.length) q = q.in("type", opts.types);
      if (opts?.from) q = q.gte("created_at", opts.from);
      if (opts?.to) q = q.lte("created_at", opts.to);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WalletTransaction[];
    },
  });
}

export function useMonthConsumption() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["wallet-month-consumption", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data, error } = await (supabase as any)
        .from("wallet_transactions")
        .select("amount, category, metadata, created_at")
        .eq("company_id", activeCompanyId)
        .eq("type", "consumption")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: true })
        .range(0, 9999);
      if (error) throw error;
      const rows = (data || []) as Array<{ amount: number; category: string; metadata: any; created_at: string }>;

      let callTotal = 0;
      let uraTotal = 0;
      let callMinutes = 0;
      let uraSeconds = 0;
      const dailyMap = new Map<string, number>();

      for (const r of rows) {
        const abs = Math.abs(Number(r.amount));
        if (r.category === "call") {
          callTotal += abs;
          callMinutes += Number(r.metadata?.minutes || 0);
        } else if (r.category === "ura") {
          uraTotal += abs;
          uraSeconds += Number(r.metadata?.duration_seconds || 0);
        }
        const day = r.created_at.slice(0, 10);
        dailyMap.set(day, (dailyMap.get(day) || 0) + abs);
      }

      const daily = Array.from(dailyMap.entries())
        .map(([day, total]) => ({ day, total: +total.toFixed(2) }))
        .sort((a, b) => a.day.localeCompare(b.day));

      return {
        callTotal: +callTotal.toFixed(2),
        uraTotal: +uraTotal.toFixed(2),
        callMinutes,
        uraSeconds,
        total: +(callTotal + uraTotal).toFixed(2),
        daily,
      };
    },
  });
}

export function useCreatePixPayment() {
  const { activeCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: { company_id: activeCompanyId, amount },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      return data as {
        success: boolean;
        payment_id: string;
        qr_code: string | null;
        qr_code_base64: string | null;
        ticket_url: string | null;
        expires_at: string;
        amount: number;
      };
    },
  });
}

export function usePaymentStatus(paymentId: string | null) {
  return useQuery({
    queryKey: ["wallet-payment", paymentId],
    enabled: !!paymentId,
    refetchInterval: (q) => {
      const data = q.state.data as WalletPayment | undefined;
      return data && data.status !== "pending" ? false : 5000;
    },
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wallet_payments")
        .select("*")
        .eq("id", paymentId)
        .single();
      if (error) throw error;
      return data as WalletPayment;
    },
  });
}

export function useUpdateWalletSettings() {
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Wallet, "low_balance_alert" | "alert_email_enabled" | "alert_in_app_enabled" | "daily_limit" | "daily_limit_action">>) => {
      if (!activeCompanyId) throw new Error("No active company");
      const { error } = await (supabase as any)
        .from("wallets")
        .update(patch)
        .eq("company_id", activeCompanyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", activeCompanyId] });
    },
  });
}
