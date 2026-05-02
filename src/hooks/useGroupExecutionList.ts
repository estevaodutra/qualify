import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface GroupExecutionList {
  id: string;
  user_id: string;
  campaign_id: string;
  name: string;
  window_type: "fixed" | "duration";
  window_start_time: string | null;
  window_end_time: string | null;
  window_duration_hours: number | null;
  monitored_events: string[];
  action_type: "webhook" | "message" | "call";
  webhook_url: string | null;
  webhook_params: Record<string, any> | Array<{ id: string; name: string; type: string; value: string }>;
  message_template: string | null;
  call_campaign_id: string | null;
  current_cycle_id: string;
  current_window_start: string | null;
  current_window_end: string | null;
  last_executed_at: string | null;
  is_active: boolean;
  execution_schedule_type: "window_end" | "scheduled" | "immediate";
  execution_scheduled_time: string | null;
  execution_days_of_week: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface GroupExecutionLead {
  id: string;
  list_id: string;
  cycle_id: string;
  phone: string;
  lid: string | null;
  name: string | null;
  origin_event: string | null;
  origin_detail: string | null;
  status: string;
  executed_at: string | null;
  error_message: string | null;
  created_at: string;
}

function calculateWindowTimes(config: {
  window_type: "fixed" | "duration";
  window_start_time?: string;
  window_end_time?: string;
  window_duration_hours?: number;
}): { start: string; end: string } {
  const now = new Date();

  if (config.window_type === "duration") {
    const hours = config.window_duration_hours || 6;
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return { start: now.toISOString(), end: end.toISOString() };
  }

  const startParts = (config.window_start_time || "08:00").split(":");
  const endParts = (config.window_end_time || "18:00").split(":");
  const startH = parseInt(startParts[0]);
  const startM = parseInt(startParts[1] || "0");
  const endH = parseInt(endParts[0]);
  const endM = parseInt(endParts[1] || "0");

  const windowStart = new Date(now);
  windowStart.setHours(startH, startM, 0, 0);

  const windowEnd = new Date(now);
  windowEnd.setHours(endH, endM, 0, 0);

  if (endH < startH || (endH === startH && endM <= startM)) {
    windowEnd.setDate(windowEnd.getDate() + 1);
  }

  if (windowStart < now) {
    if (now < windowEnd) {
      return { start: windowStart.toISOString(), end: windowEnd.toISOString() };
    }
    windowStart.setDate(windowStart.getDate() + 1);
    windowEnd.setDate(windowEnd.getDate() + 1);
  }

  return { start: windowStart.toISOString(), end: windowEnd.toISOString() };
}

export function useGroupExecutionList(campaignId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["group-execution-lists", campaignId];

  const { data: lists, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("group_execution_lists")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as GroupExecutionList[];
    },
    enabled: !!campaignId && !!user,
  });

  const useListLeads = (listId: string | undefined, cycleId: string | undefined, isFulltime: boolean = false) => {
    const leadsKey = ["group-execution-leads", listId, isFulltime ? "fulltime-24h" : cycleId];

    // Realtime subscription for execution leads
    useEffect(() => {
      if (!listId) return;

      const channel = supabase
        .channel(`exec_leads_rt_${listId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "group_execution_leads",
            filter: `list_id=eq.${listId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: leadsKey });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [listId, cycleId, isFulltime]);

    return useQuery({
      queryKey: leadsKey,
      queryFn: async () => {
        let query = (supabase as any)
          .from("group_execution_leads")
          .select("*")
          .eq("list_id", listId);

        if (isFulltime) {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", since);
        } else {
          query = query.eq("cycle_id", cycleId);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) throw error;
        return (data || []) as GroupExecutionLead[];
      },
      enabled: !!listId && (isFulltime || !!cycleId),
    });
  };

  const createList = useMutation({
    mutationFn: async (config: {
      name: string;
      window_type: "fixed" | "duration";
      window_start_time?: string;
      window_end_time?: string;
      window_duration_hours?: number;
      monitored_events: string[];
      action_type: "webhook" | "message" | "call";
      webhook_url?: string;
      webhook_params?: Record<string, any> | Array<{ id: string; name: string; type: string; value: string }>;
      message_template?: string;
      call_campaign_id?: string;
      execution_schedule_type?: "window_end" | "scheduled" | "immediate";
      execution_scheduled_time?: string;
      execution_days_of_week?: number[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { start, end } = calculateWindowTimes(config);

      const { data, error } = await (supabase as any)
        .from("group_execution_lists")
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          name: config.name,
          window_type: config.window_type,
          window_start_time: config.window_type === "fixed" ? config.window_start_time : null,
          window_end_time: config.window_type === "fixed" ? config.window_end_time : null,
          window_duration_hours: config.window_type === "duration" ? config.window_duration_hours : null,
          monitored_events: config.monitored_events,
          action_type: config.action_type,
          webhook_url: config.action_type === "webhook" ? config.webhook_url : null,
          webhook_params: config.action_type === "webhook" ? (config.webhook_params ?? {}) : {},
          message_template: config.action_type === "message" ? config.message_template : null,
          call_campaign_id: config.action_type === "call" ? config.call_campaign_id : null,
          current_window_start: start,
          current_window_end: end,
          is_active: true,
          execution_schedule_type: config.execution_schedule_type || "window_end",
          execution_scheduled_time: config.execution_schedule_type === "scheduled" ? config.execution_scheduled_time : null,
          execution_days_of_week: config.execution_schedule_type === "scheduled" ? config.execution_days_of_week : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateList = useMutation({
    mutationFn: async (params: {
      id: string;
      config: {
        name: string;
        window_type: "fixed" | "duration";
        window_start_time?: string;
        window_end_time?: string;
        window_duration_hours?: number;
        monitored_events: string[];
        action_type: "webhook" | "message" | "call";
        webhook_url?: string;
        webhook_params?: Record<string, any> | Array<{ id: string; name: string; type: string; value: string }>;
        message_template?: string;
        call_campaign_id?: string;
        execution_schedule_type?: "window_end" | "scheduled" | "immediate";
        execution_scheduled_time?: string;
        execution_days_of_week?: number[];
      };
    }) => {
      const { start, end } = calculateWindowTimes(params.config);

      const { error } = await (supabase as any)
        .from("group_execution_lists")
        .update({
          name: params.config.name,
          window_type: params.config.window_type,
          window_start_time: params.config.window_type === "fixed" ? params.config.window_start_time : null,
          window_end_time: params.config.window_type === "fixed" ? params.config.window_end_time : null,
          window_duration_hours: params.config.window_type === "duration" ? params.config.window_duration_hours : null,
          monitored_events: params.config.monitored_events,
          action_type: params.config.action_type,
          webhook_url: params.config.action_type === "webhook" ? params.config.webhook_url : null,
          webhook_params: params.config.action_type === "webhook" ? (params.config.webhook_params ?? {}) : {},
          message_template: params.config.action_type === "message" ? params.config.message_template : null,
          call_campaign_id: params.config.action_type === "call" ? params.config.call_campaign_id : null,
          current_window_start: start,
          current_window_end: end,
          current_cycle_id: crypto.randomUUID(),
          updated_at: new Date().toISOString(),
          execution_schedule_type: params.config.execution_schedule_type || "window_end",
          execution_scheduled_time: params.config.execution_schedule_type === "scheduled" ? params.config.execution_scheduled_time : null,
          execution_days_of_week: params.config.execution_schedule_type === "scheduled" ? params.config.execution_days_of_week : null,
        })
        .eq("id", params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (params: { id: string; is_active: boolean; list?: GroupExecutionList }) => {
      const updates: Record<string, any> = {
        is_active: params.is_active,
        updated_at: new Date().toISOString(),
      };

      if (params.is_active && params.list) {
        const { start, end } = calculateWindowTimes({
          window_type: params.list.window_type as "fixed" | "duration",
          window_start_time: params.list.window_start_time || undefined,
          window_end_time: params.list.window_end_time || undefined,
          window_duration_hours: params.list.window_duration_hours || undefined,
        });
        updates.current_window_start = start;
        updates.current_window_end = end;
        updates.current_cycle_id = crypto.randomUUID();
      }

      const { error } = await (supabase as any)
        .from("group_execution_lists")
        .update(updates)
        .eq("id", params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const executeNow = useMutation({
    mutationFn: async (listId: string) => {
      const { data, error } = await supabase.functions.invoke("group-execution-processor", {
        body: { list_id: listId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const executeLeads = useMutation({
    mutationFn: async (params: { listId: string; leadIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke("group-execution-processor", {
        body: { list_id: params.listId, lead_ids: params.leadIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const manualExecute = useMutation({
    mutationFn: async (params: {
      listId: string;
      members: Array<{ phone: string; lid?: string | null; name?: string | null }>;
      intervalSeconds?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("group-execution-processor", {
        body: {
          list_id: params.listId,
          members: params.members,
          interval_seconds: params.intervalSeconds ?? 0,
        },
      });
      if (error) throw error;
      return data as { ok: boolean; processed: number; errors: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await (supabase as any)
        .from("group_execution_lists")
        .delete()
        .eq("id", listId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    lists: lists || [],
    isLoading,
    useListLeads,
    createList,
    updateList,
    toggleActive,
    executeNow,
    executeLeads,
    manualExecute,
    deleteList,
  };
}
