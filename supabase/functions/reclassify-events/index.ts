import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  classifyEvent,
  extractContext,
} from "../_shared/event-classifier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse options
    const body = await req.json().catch(() => ({}));
    const onlyPending = body.only_pending === true;
    const onlyUnknown = body.only_unknown === true;
    const eventId = body.event_id as string | undefined;
    const force = body.force === true;
    const inputCursor = body.last_id as string | undefined;
    const batchAll = body.batch_all === true;

    // Get user from JWT (optional for batch_all mode)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    // batch_all mode skips user filter (service role only)
    if (!batchAll && !userId) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[reclassify-events] User: ${userId || "ALL"}, batchAll: ${batchAll}, onlyPending: ${onlyPending}, onlyUnknown: ${onlyUnknown}, eventId: ${eventId || "none"}, force: ${force}, cursor: ${inputCursor || "none"}`);

    // ==========================================
    // SINGLE EVENT REPROCESSING
    // ==========================================
    if (eventId) {
      let query2 = supabase
        .from("webhook_events")
        .select("id, source, raw_event, event_type, classification, processing_status, matched_rule")
        .eq("id", eventId);
      if (userId) query2 = query2.eq("user_id", userId);
      const { data: event, error: fetchError } = await query2
        .maybeSingle();

      if (fetchError) {
        console.error("[reclassify-events] Fetch error:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch event" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!event) {
        return new Response(
          JSON.stringify({ error: "Event not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rawEvent = event.raw_event as Record<string, unknown>;
      const classification = classifyEvent(event.source, rawEvent);
      const context = extractContext(event.source, rawEvent);
      const expectedStatus = classification.classification === "identified" ? "processed" : "pending";

      const hasChanged =
        force ||
        event.event_type !== classification.eventType ||
        event.classification !== classification.classification ||
        event.processing_status !== expectedStatus;

      if (hasChanged) {
        const { error: updateError } = await supabase
          .from("webhook_events")
          .update({
            event_type: classification.eventType,
            event_subtype: classification.eventSubtype,
            classification: classification.classification,
            direction: classification.direction,
            confidence: classification.confidence,
            matched_rule: classification.matchedRule,
            processing_status: expectedStatus,
            processed_at: expectedStatus === "processed" ? new Date().toISOString() : null,
            chat_jid: context.chatJid,
            chat_type: context.chatType,
            chat_name: context.chatName,
            sender_phone: context.senderPhone,
            sender_name: context.senderName,
            message_id: context.messageId,
            event_timestamp: context.eventTimestamp,
            processing_error: null,
          })
          .eq("id", event.id);

        if (updateError) {
          console.error(`[reclassify-events] Update error for ${event.id}:`, updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update event" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[reclassify-events] Reprocessed ${event.id}: ${event.event_type} -> ${classification.eventType}, status: ${expectedStatus}`);
      } else {
        console.log(`[reclassify-events] Event ${event.id} unchanged`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          event_id: event.id,
          event_type: classification.eventType,
          classification: classification.classification,
          processing_status: expectedStatus,
          changed: hasChanged,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // BATCH RECLASSIFICATION
    // ==========================================
    const BATCH_SIZE = 50;
    let reclassified = 0;
    let unchanged = 0;
    let errors = 0;
    let totalProcessed = 0;
    let lastId: string | null = inputCursor || null;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("webhook_events")
        .select("id, source, raw_event, event_type, classification, processing_status, matched_rule");
      if (userId) query = query.eq("user_id", userId);

      if (onlyPending) {
        query = query.eq("classification", "pending");
      } else if (onlyUnknown) {
        query = query.eq("event_type", "unknown");
      } else {
        query = query.is("matched_rule", null);
      }

      if (lastId) {
        query = query.gt("id", lastId);
      }

      query = query.order("id", { ascending: true }).limit(BATCH_SIZE);

      const { data: events, error: fetchError } = await query;

      if (fetchError) {
        console.error("[reclassify-events] Fetch error:", fetchError);
        if (totalProcessed > 0) {
          hasMore = false;
          break;
        }
        return new Response(
          JSON.stringify({ error: "Failed to fetch events" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const batch = events || [];
      console.log(`[reclassify-events] Batch: ${batch.length} events (processed so far: ${totalProcessed})`);

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      for (const event of batch) {
        try {
          const rawEvent = event.raw_event as Record<string, unknown>;
          const classification = classifyEvent(event.source, rawEvent);
          const context = extractContext(event.source, rawEvent);

          const expectedStatus = classification.classification === "identified" ? "processed" : "pending";
          const hasChanged =
            event.event_type !== classification.eventType ||
            event.classification !== classification.classification ||
            event.processing_status !== expectedStatus ||
            !event.matched_rule;

          if (reclassified + unchanged + errors < 10) {
            console.log(`[reclassify-events] Event ${event.id}: current=${event.event_type} -> new=${classification.eventType} (rule: ${classification.matchedRule}) hasChanged=${hasChanged}`);
          }

          if (hasChanged) {
            const { error: updateError } = await supabase
              .from("webhook_events")
              .update({
                event_type: classification.eventType,
                event_subtype: classification.eventSubtype,
                classification: classification.classification,
                direction: classification.direction,
                confidence: classification.confidence,
                matched_rule: classification.matchedRule,
                processing_status: expectedStatus,
                processed_at: expectedStatus === "processed" ? new Date().toISOString() : null,
                chat_jid: context.chatJid,
                chat_type: context.chatType,
                chat_name: context.chatName,
                sender_phone: context.senderPhone,
                sender_name: context.senderName,
                message_id: context.messageId,
                event_timestamp: context.eventTimestamp,
              })
              .eq("id", event.id);

            if (updateError) {
              console.error(`[reclassify-events] Update error for ${event.id}:`, updateError);
              errors++;
            } else {
              reclassified++;
            }
          } else {
            unchanged++;
          }
        } catch (err) {
          console.error(`[reclassify-events] Error processing event ${(event as any).id}:`, err);
          errors++;
        }
      }

      totalProcessed += batch.length;
      lastId = batch[batch.length - 1].id as string;

      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      } else if (totalProcessed >= 500) {
        hasMore = true;
        break;
      }
    }

    const result = {
      success: true,
      total_processed: totalProcessed,
      reclassified,
      unchanged,
      errors,
      has_more: hasMore,
      last_id: lastId,
    };

    console.log("[reclassify-events] Result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[reclassify-events] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
