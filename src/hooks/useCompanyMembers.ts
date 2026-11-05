import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface CompanyMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  full_name: string | null;
  email: string | null;
  extension?: string | null;
  api4com_token?: string | null;
  sip_domain?: string | null;
}

export function useCompanyMembers() {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["company-members", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<CompanyMember[]> => {
      const { data: members, error } = await (supabase as any)
        .from("company_members")
        .select("id, user_id, role, is_active, joined_at")
        .eq("company_id", activeCompanyId)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      if (!members || members.length === 0) return [];

      const userIds = members.map((m: any) => m.user_id);
      
      const [profilesRes, opsRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, full_name, email, api4com_token, api4com_extension, api4com_domain")
          .in("id", userIds),
        (supabase as any)
          .from("call_operators")
          .select("user_id, extension, api4com_token, sip_domain")
          .eq("company_id", activeCompanyId)
          .in("user_id", userIds)
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const opMap = new Map((opsRes.data || []).map((o: any) => [o.user_id, o]));

      return members.map((m: any) => {
        const p = profileMap.get(m.user_id) as any;
        const op = opMap.get(m.user_id) as any;

        const effectiveExt = op?.extension || p?.api4com_extension || null;
        const effectiveToken = op?.api4com_token || p?.api4com_token || null;
        const effectiveDomain = op?.sip_domain || p?.api4com_domain || null;

        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          is_active: m.is_active,
          joined_at: m.joined_at,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
          extension: effectiveExt,
          api4com_token: effectiveToken,
          sip_domain: effectiveDomain,
        };
      });
    },
  });

  const addMember = useMutation({
    mutationFn: async (params: {
      email: string;
      role: "admin" | "operator";
      extension?: string;
      api4com_token?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("company-add-member", {
        body: {
          email: params.email,
          role: params.role,
          extension: params.extension || null,
          api4com_token: params.api4com_token || null,
          company_id: activeCompanyId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase.functions.invoke("company-add-member", {
        body: {
          action: "remove",
          member_id: memberId,
          company_id: activeCompanyId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    },
  });

  const updateMemberTelephony = useMutation({
    mutationFn: async (params: {
      userId: string;
      extension?: string | null;
      api4com_token?: string | null;
    }) => {
      const { data, error } = await supabase.functions.invoke("company-add-member", {
        body: {
          action: "update_telephony",
          user_id: params.userId,
          extension: params.extension !== undefined ? params.extension : undefined,
          api4com_token: params.api4com_token !== undefined ? params.api4com_token : undefined,
          company_id: activeCompanyId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    },
  });

  const updateMemberExtension = useMutation({
    mutationFn: async (params: { userId: string; extension: string }) => {
      return updateMemberTelephony.mutateAsync({
        userId: params.userId,
        extension: params.extension,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    },
  });

  return {
    members: query.data || [],
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    addMember,
    removeMember,
    updateMemberExtension,
    updateMemberTelephony,
  };
}
