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
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return members.map((m: any) => {
        const p = profileMap.get(m.user_id) as any;
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          is_active: m.is_active,
          joined_at: m.joined_at,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
        };
      });
    },
  });

  const addMember = useMutation({
    mutationFn: async (params: { email: string; role: "admin" | "operator"; extension?: string }) => {
      const { data, error } = await supabase.functions.invoke("company-add-member", {
        body: {
          email: params.email,
          role: params.role,
          extension: params.extension || null,
          company_id: activeCompanyId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any)
        .from("company_members")
        .delete()
        .eq("id", memberId)
        .eq("company_id", activeCompanyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members", activeCompanyId] });
    },
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    addMember,
    removeMember,
  };
}
