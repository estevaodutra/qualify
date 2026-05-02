import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

export interface Alert {
  id: string;
  severity: "info" | "warning" | "error" | "success";
  title: string;
  description: string;
  entity: string;
  timestamp: string;
  read: boolean;
}

interface DbAlert {
  id: string;
  severity: string;
  title: string;
  description: string | null;
  entity: string | null;
  created_at: string;
  read: boolean | null;
  user_id: string | null;
}

function transformDbToFrontend(dbAlert: DbAlert): Alert {
  return {
    id: dbAlert.id,
    severity: dbAlert.severity as Alert["severity"],
    title: dbAlert.title,
    description: dbAlert.description || "",
    entity: dbAlert.entity || "",
    timestamp: formatDistanceToNow(new Date(dbAlert.created_at), { addSuffix: true, locale: ptBR }),
    read: dbAlert.read || false,
  };
}

export function useAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data as DbAlert[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  const { mutateAsync: markAsRead } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const { mutateAsync: markAllAsRead } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Todos os alertas marcados como lidos" });
    },
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  return {
    alerts,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
