import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useEffect } from "react";

export interface Alert {
  id: string;
  severity: "info" | "warning" | "error" | "success";
  title: string;
  description: string;
  entity: string;
  timestamp: string;
  read: boolean;
  link?: string | null;
  metadata?: any;
  created_at?: string;
  user_id?: string | null;
  company_id?: string | null;
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
  company_id?: string | null;
  link?: string | null;
  metadata?: any;
}

function transformDbToFrontend(dbAlert: DbAlert): Alert {
  return {
    id: dbAlert.id,
    severity: (dbAlert.severity || "info") as Alert["severity"],
    title: dbAlert.title,
    description: dbAlert.description || "",
    entity: dbAlert.entity || "",
    link: dbAlert.link || null,
    metadata: dbAlert.metadata || null,
    created_at: dbAlert.created_at,
    user_id: dbAlert.user_id,
    company_id: dbAlert.company_id,
    timestamp: formatDistanceToNow(new Date(dbAlert.created_at), { addSuffix: true, locale: ptBR }),
    read: dbAlert.read || false,
  };
}

export function useAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts", activeCompanyId, user?.id],
    queryFn: async () => {
      let query = (supabase as any)
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        if (user?.id) {
          // Mostra alertas da empresa ativa:
          // - Alertas sem user_id (gerais da empresa)
          // - Alertas direcionados especificamente a este usuário (ex: menção em card)
          query = query
            .eq("company_id", activeCompanyId)
            .or(`user_id.is.null,user_id.eq.${user.id}`);
        } else {
          query = query.eq("company_id", activeCompanyId);
        }
      } else if (user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        // Fallback simples se o filtro .or der problema de sintaxe em alguma versão do PostgREST
        const fallbackQuery = (supabase as any)
          .from("alerts")
          .select("*")
          .order("created_at", { ascending: false });

        if (activeCompanyId) {
          fallbackQuery.eq("company_id", activeCompanyId);
        }

        const { data: fallbackData, error: fbError } = await fallbackQuery;
        if (fbError) throw fbError;
        return ((fallbackData || []) as DbAlert[])
          .filter((a) => !a.user_id || a.user_id === user?.id)
          .map(transformDbToFrontend);
      }

      return ((data || []) as DbAlert[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  // Listener Realtime para alertas e pop-ups
  useEffect(() => {
    if (!user) return;

    const channelName = `alerts-channel-${user.id}-${activeCompanyId || "default"}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
        },
        (payload) => {
          const newAlert = payload.new as DbAlert;
          const isTargetedToMe =
            newAlert.user_id === user.id ||
            (!newAlert.user_id && newAlert.company_id === activeCompanyId);

          if (isTargetedToMe) {
            queryClient.invalidateQueries({ queryKey: ["alerts"] });

            // Dispara evento para abrir o pop-up ao lado do painel de notificações
            window.dispatchEvent(
              new CustomEvent("app:notification_popup", {
                detail: {
                  id: newAlert.id,
                  userId: newAlert.user_id,
                  title: newAlert.title,
                  description: newAlert.description,
                  entity: newAlert.entity,
                  link: newAlert.link,
                  created_at: newAlert.created_at,
                },
              })
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "alerts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      )
      .on("broadcast", { event: "mention_notification" }, ({ payload }) => {
        if (!payload) return;
        if (payload.userId === user.id) {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
          window.dispatchEvent(
            new CustomEvent("app:notification_popup", {
              detail: payload,
            })
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeCompanyId, queryClient]);

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
      let query = supabase
        .from("alerts")
        .update({ read: true })
        .eq("read", false);

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }
      if (user?.id) {
        query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
      }

      const { error } = await query;
      if (error) {
        // Fallback
        await supabase
          .from("alerts")
          .update({ read: true })
          .eq("read", false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Todas as notificações marcadas como lidas" });
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
