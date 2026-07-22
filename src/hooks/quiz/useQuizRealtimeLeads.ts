import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQuizRealtimeLeads(funnelId: string, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!funnelId || !enabled) return;

    // Subscribe to quiz_submissions updates for this funnel
    const channel = supabase
      .channel(`quiz_realtime_leads_${funnelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quiz_submissions",
          filter: `funnel_id=eq.${funnelId}`
        },
        (payload) => {
          // Invalidate leads query to trigger a fresh query fetch
          queryClient.invalidateQueries({
            queryKey: ["quiz_leads_paginated", funnelId]
          });

          // If updating specific details drawer
          if (payload.new && (payload.new as any).id) {
            queryClient.invalidateQueries({
              queryKey: ["quiz_lead_details", (payload.new as any).id]
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [funnelId, enabled, queryClient]);
}
