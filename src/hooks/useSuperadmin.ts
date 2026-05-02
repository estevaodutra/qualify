import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSuperadmin() {
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["superadmin", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "superadmin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  return {
    isSuperadmin: query.data === true,
    isLoading: authLoading || query.isLoading,
  };
}
