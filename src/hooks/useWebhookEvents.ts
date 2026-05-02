import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WebhookEvent {
  id: string;
  userId: string | null;
  source: string;
  externalInstanceId: string;
  instanceId: string | null;
  eventType: string;
  eventSubtype: string | null;
  classification: string;
  direction: string | null;
  confidence: string | null;
  matchedRule: string | null;
  chatJid: string | null;
  chatType: string | null;
  chatName: string | null;
  senderPhone: string | null;
  senderName: string | null;
  messageId: string | null;
  rawEvent: Record<string, unknown>;
  processingStatus: string;
  processingResult: Record<string, unknown> | null;
  processingError: string | null;
  eventTimestamp: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export interface WebhookEventFilters {
  eventType?: string;
  classification?: string;
  processingStatus?: string;
  instanceId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface WebhookEventStats {
  today: number;
  pending: number;
  failed: number;
  processed: number;
  byType: Record<string, number>;
}

const EVENT_CATEGORIES: Record<string, string[]> = {
  messages: [
    "text_message", "image_message", "video_message", "audio_message",
    "document_message", "sticker_message", "location_message", "contact_message",
    "message_status", "message_reaction", "message_revoked", "message_received", "message_read", "read_by_me",
    "played",
  ],
  interactive: ["button_response", "list_response", "poll_response", "reaction"],
  groups: ["group_join", "group_leave", "group_promote", "group_demote", "group_update"],
  connection: ["connection_status", "qrcode_update"],
  calls: ["call_received"],
  pending: ["unknown"],
};

export function getEventCategory(eventType: string): string {
  for (const [category, types] of Object.entries(EVENT_CATEGORIES)) {
    if (types.includes(eventType)) {
      return category;
    }
  }
  return "pending";
}

function mapDbToWebhookEvent(row: Record<string, unknown>): WebhookEvent {
  return {
    id: row.id as string,
    userId: row.user_id as string | null,
    source: row.source as string,
    externalInstanceId: row.external_instance_id as string,
    instanceId: row.instance_id as string | null,
    eventType: row.event_type as string,
    eventSubtype: row.event_subtype as string | null,
    classification: row.classification as string,
    direction: row.direction as string | null,
    confidence: row.confidence as string | null,
    matchedRule: row.matched_rule as string | null,
    chatJid: row.chat_jid as string | null,
    chatType: row.chat_type as string | null,
    chatName: row.chat_name as string | null,
    senderPhone: row.sender_phone as string | null,
    senderName: row.sender_name as string | null,
    messageId: row.message_id as string | null,
    rawEvent: row.raw_event as Record<string, unknown>,
    processingStatus: row.processing_status as string,
    processingResult: row.processing_result as Record<string, unknown> | null,
    processingError: row.processing_error as string | null,
    eventTimestamp: row.event_timestamp as string | null,
    receivedAt: row.received_at as string,
    processedAt: row.processed_at as string | null,
  };
}

export function useWebhookEvents(filters: WebhookEventFilters = {}, page = 1, pageSize = 50) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["webhook-events", filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("webhook_events")
        .select("*", { count: "exact" })
        .order("received_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      if (filters.eventType) {
        query = query.eq("event_type", filters.eventType);
      }
      
      if (filters.classification) {
        query = query.eq("classification", filters.classification);
      }
      
      if (filters.processingStatus) {
        query = query.eq("processing_status", filters.processingStatus);
      }
      
      if (filters.instanceId) {
        query = query.eq("instance_id", filters.instanceId);
      }
      
      if (filters.dateFrom) {
        query = query.gte("received_at", filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte("received_at", filters.dateTo);
      }
      
      if (filters.search) {
        query = query.or(
          `chat_jid.ilike.%${filters.search}%,sender_phone.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%,message_id.ilike.%${filters.search}%`
        );
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        events: (data || []).map(mapDbToWebhookEvent),
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!user,
  });
}

export function useWebhookEventById(id: string) {
  return useQuery({
    queryKey: ["webhook-event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      return mapDbToWebhookEvent(data as Record<string, unknown>);
    },
    enabled: !!id,
    staleTime: 0,
  });
}

export function useWebhookEventStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["webhook-events-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get today's count
      const { count: todayCount } = await supabase
        .from("webhook_events")
        .select("*", { count: "exact", head: true })
        .gte("received_at", today.toISOString());
      
      // Get pending count (estimated for performance)
      const { count: pendingCount } = await supabase
        .from("webhook_events")
        .select("*", { count: "estimated", head: true })
        .eq("classification", "pending");
      
      // Get failed count (estimated for performance)
      const { count: failedCount } = await supabase
        .from("webhook_events")
        .select("*", { count: "estimated", head: true })
        .eq("processing_status", "failed");
      
      // Get processed count (estimated for performance)
      const { count: processedCount } = await supabase
        .from("webhook_events")
        .select("*", { count: "estimated", head: true })
        .eq("processing_status", "processed");
      
      // Get counts by type (last 24 hours, limited to 1000)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: byTypeData } = await supabase
        .from("webhook_events")
        .select("event_type")
        .gte("received_at", yesterday.toISOString())
        .limit(1000);
      
      const byType: Record<string, number> = {};
      (byTypeData || []).forEach((row) => {
        const type = row.event_type;
        byType[type] = (byType[type] || 0) + 1;
      });
      
      return {
        today: todayCount || 0,
        pending: pendingCount || 0,
        failed: failedCount || 0,
        processed: processedCount || 0,
        byType,
      } as WebhookEventStats;
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useClassifyEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, eventType }: { id: string; eventType: string }) => {
      const { error } = await supabase
        .from("webhook_events")
        .update({
          event_type: eventType,
          classification: "identified",
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events-stats"] });
    },
  });
}

export interface ReprocessResult {
  success: boolean;
  event_id: string;
  event_type: string;
  classification: string;
  processing_status: string;
  changed: boolean;
}

export function useReprocessEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<ReprocessResult> => {
      const { data, error } = await supabase.functions.invoke('reclassify-events', {
        body: { event_id: id, force: true }
      });
      
      if (error) throw error;
      return data as ReprocessResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events-stats"] });
    },
  });
}

export function useIgnoreEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_events")
        .update({
          processing_status: "ignored",
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events-stats"] });
    },
  });
}

export interface ReclassifyResult {
  success: boolean;
  total_processed: number;
  reclassified: number;
  unchanged: number;
  errors?: number;
  has_more?: boolean;
  last_id?: string;
}

export function useReclassifyAllEvents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (options?: { onlyPending?: boolean; onlyUnknown?: boolean; lastId?: string | null }): Promise<ReclassifyResult> => {
      const { data, error } = await supabase.functions.invoke('reclassify-events', {
        body: { 
          only_pending: options?.onlyPending,
          only_unknown: options?.onlyUnknown,
          last_id: options?.lastId || undefined,
        }
      });
      
      if (error) throw error;
      return data as ReclassifyResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events-stats"] });
    },
  });
}
