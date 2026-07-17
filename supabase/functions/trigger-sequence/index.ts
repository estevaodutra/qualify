// deploy: 2026-05-13
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FieldMapping {
  sourceField: string;
  variableName: string;
}

interface TriggerConfig {
  fieldMappings?: FieldMapping[];
  webhookId?: string;
}

interface MessageSequence {
  id: string;
  name: string;
  active: boolean;
  group_campaign_id: string;
  user_id: string;
  trigger_type: string;
  trigger_config: TriggerConfig | null;
}

interface GroupCampaign {
  id: string;
  name: string;
  instance_id: string | null;
  config?: Record<string, unknown>;
}

/**
 * Extract a value from a nested object using dot notation path
 * e.g., extractField({ user: { name: "João" } }, "user.name") returns "João"
 */
function extractField(payload: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce((obj: unknown, key: string) => {
    if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, payload);
  
  // Convert to string, handling different types
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Apply field mappings to extract custom fields from payload
 */
function applyFieldMappings(
  payload: Record<string, unknown>,
  mappings: FieldMapping[]
): Record<string, string> {
  const customFields: Record<string, string> = {};
  
  for (const mapping of mappings) {
    const value = extractField(payload, mapping.sourceField);
    customFields[mapping.variableName] = value;
  }
  
  return customFields;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract sequence ID from URL path
    // Expected: /trigger-sequence/{sequenceId}
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const sequenceId = pathParts[pathParts.length - 1];

    if (!sequenceId || sequenceId === "trigger-sequence") {
      return new Response(
        JSON.stringify({ 
          error: "Sequence ID is required in URL path",
          example: "/functions/v1/trigger-sequence/{sequence-id}"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[TriggerSequence] Received request for sequence: ${sequenceId}`);

    // Extract triggerId if provided (used to select specific branch from trigger node)
    const triggerIdFromUrl = url.searchParams.get("triggerId");

    // Parse the incoming payload
    let payload: Record<string, unknown> = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        payload = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error("[TriggerSequence] Failed to parse JSON payload:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[TriggerSequence] Payload received:`, JSON.stringify(payload).substring(0, 500));

    // Fetch the sequence
    const { data: sequence, error: sequenceError } = await supabase
      .from("message_sequences")
      .select("id, name, active, group_campaign_id, user_id, trigger_type, trigger_config")
      .eq("id", sequenceId)
      .single();

    if (sequenceError || !sequence) {
      console.error("[TriggerSequence] Sequence not found:", sequenceError);
      return new Response(
        JSON.stringify({ error: "Sequence not found", sequenceId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedSequence = sequence as MessageSequence;
    const isManualTest = !!(triggerIdFromUrl || payload.triggerId || payload.trigger_id);

    // Validate sequence is active (unless this is a manual test from the editor)
    if (!typedSequence.active && !isManualTest) {
      return new Response(
        JSON.stringify({ error: "Sequence is not active", sequenceId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the legacy campaign for backwards compatibility (fallback instance_id)
    const { data: campaign } = await supabase
      .from("group_campaigns")
      .select("id, name, instance_id, config")
      .eq("id", typedSequence.group_campaign_id)
      .maybeSingle();

    const typedCampaign = (campaign || {}) as GroupCampaign;
    const triggerConfig = typedSequence.trigger_config as Record<string, unknown> || {};

    // ── Deduplication guard (best-effort) ───────────────────────────────────
    // Prevent the same sequence from firing multiple times within 15 seconds.
    // Wrapped in try-catch so errors here never block the main execution.
    try {
      const dedupeWindow = new Date(Date.now() - 15000).toISOString();
      const { data: recentExec } = await supabase
        .from("sequence_executions")
        .select("id, created_at")
        .eq("sequence_id", typedSequence.id)
        .gte("created_at", dedupeWindow)
        .limit(1)
        .maybeSingle();

      if (recentExec) {
        console.log(`[TriggerSequence] Deduplicated — sequence ${sequenceId} already triggered at ${recentExec.created_at}`);
        return new Response(
          JSON.stringify({ success: true, deduplicated: true, message: "Sequence already triggered recently" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert lock record so concurrent calls are blocked
      await supabase.from("sequence_executions").insert({
        sequence_id: typedSequence.id,
        campaign_id: typedCampaign.id || typedSequence.id,
        user_id: typedSequence.user_id,
        status: "processing",
        trigger_context: {},
        destinations: [],
        nodes_data: [],
        nodes_processed: 0,
        nodes_failed: 0,
        current_node_index: 0,
      });
    } catch (dedupeErr) {
      console.warn("[TriggerSequence] Deduplication check failed (non-fatal):", dedupeErr);
    }
    // ── End deduplication guard ──────────────────────────────────────────────

    const webhookPayload = {
      received_at: new Date().toISOString(),
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      query_params: Object.fromEntries(url.searchParams.entries()),
      body: payload,
    };

    // Apply field mappings from trigger_config
    const fieldMappings = (triggerConfig as any).fieldMappings || [];
    const customFields = applyFieldMappings(payload, fieldMappings);

    // Fallback: auto-map simple top-level payload keys that aren't already mapped
    for (const [key, value] of Object.entries(payload)) {
      if (!(key in customFields) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) {
        customFields[key] = String(value);
      }
    }

    console.log(`[TriggerSequence] Applied ${fieldMappings.length} field mappings + fallback keys:`, customFields);

    // Check if payload contains destination phone for private sending
    const destinationPhone = extractField(payload, "destination.phone") ||
                             extractField(payload, "phone") ||
                             extractField(payload, "to");

    const isGroupMode = triggerConfig.isGroup !== false;

    if (!isGroupMode && !destinationPhone) {
      console.error(`[TriggerSequence] Individual conversation mode, but no destination phone found in payload`);
      return new Response(
        JSON.stringify({ error: "No destination phone found in payload for individual conversation mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group scope config (new, additive — instanceId/groupScope/selectedGroupJids
    // on the webhook trigger's config). Absent for every sequence saved before
    // this existed, which must keep its exact original behavior: single first
    // campaign group as the destination.
    const instanceId = (triggerConfig as Record<string, unknown>).instanceId as string | undefined;
    const groupScope = (triggerConfig as Record<string, unknown>).groupScope as "all" | "selected" | undefined;
    const selectedGroupJids = (triggerConfig as Record<string, unknown>).selectedGroupJids as string[] | undefined;

    // Resolve every destination this trigger should fan out to. Private
    // (phone-based) destinations are always a single target, unchanged from
    // before. Group destinations fan out to more than one group only when the
    // trigger was explicitly configured with groupScope "all"/"selected" —
    // otherwise (groupScope undefined, i.e. every pre-existing sequence)
    // behavior is exactly as before: a single first campaign group.
    const shouldSendToGroup = isGroupMode && !triggerConfig.sendPrivate;
    let targetGroups: { group_jid: string; group_name: string | null }[] = [];

    if (shouldSendToGroup) {
      if (groupScope === "all" || groupScope === "selected") {
        let query = supabase
          .from("campaign_groups")
          .select("group_jid, group_name, instance_id")
          .in("campaign_id", [typedSequence.id, typedSequence.group_campaign_id].filter(Boolean));
        const { data: groups } = await query;
        let resolved = (groups || []) as { group_jid: string; group_name: string | null; instance_id: string | null }[];
        if (groupScope === "selected" && selectedGroupJids && selectedGroupJids.length > 0) {
          resolved = resolved.filter((g) => selectedGroupJids.includes(g.group_jid));
        }
        targetGroups = resolved.map((g) => ({ group_jid: g.group_jid, group_name: g.group_name }));
        console.log(`[TriggerSequence] Group scope "${groupScope}" resolved ${targetGroups.length} target group(s)`);
      } else {
        const { data: firstGroup } = await supabase
          .from("campaign_groups")
          .select("group_jid, group_name")
          .in("campaign_id", [typedSequence.id, typedSequence.group_campaign_id].filter(Boolean))
          .limit(1)
          .maybeSingle();

        if (firstGroup) targetGroups = [firstGroup];
        console.log(`[TriggerSequence] No phone in payload, using first group as destination: ${firstGroup?.group_jid}`);
      }
    }

    // Build the list of (respondentJid, respondentName, groupJid) destinations
    // to run the sequence for -- exactly 1 for the phone-based/legacy-single-
    // group paths, N for a group-scope fan-out.
    const destinations = shouldSendToGroup
      ? targetGroups.map((g) => ({ respondentJid: g.group_jid, respondentName: g.group_name || "", groupJid: g.group_jid }))
      : [{ respondentJid: `${destinationPhone}@s.whatsapp.net`, respondentName: extractField(payload, "name") || extractField(payload, "user.name") || "", groupJid: "" }];

    console.log(`[TriggerSequence] Resolved ${destinations.length} destination(s) for this trigger`);

    const executeUrl = `${supabaseUrl}/functions/v1/execute-message`;
    const results: Array<{ groupJid: string; success: boolean; executeResult?: unknown; error?: unknown }> = [];

    // Sequential (not Promise.all) to avoid bursting the WhatsApp provider's
    // rate limits when fanning out to several groups at once.
    for (const dest of destinations) {
      const triggerContext: Record<string, unknown> = {
        respondentPhone: destinationPhone,
        respondentName: dest.respondentName,
        respondentJid: dest.respondentJid,
        groupJid: dest.groupJid,
        sendPrivate: !shouldSendToGroup,
        customFields,
        webhookPayload,
        triggerId: triggerIdFromUrl || payload.triggerId || payload.trigger_id,
      };

      const executePayload = {
        campaignId: typedCampaign.id || typedSequence.id,
        sequenceId: typedSequence.id,
        triggerContext,
      };

      console.log(`[TriggerSequence] Calling execute-message with:`, JSON.stringify(executePayload).substring(0, 500));

      const executeResponse = await fetch(executeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify(executePayload)
      });

      const responseText = await executeResponse.text();
      let executeResult;
      try {
        executeResult = JSON.parse(responseText);
      } catch {
        executeResult = { raw: responseText };
      }

      if (!executeResponse.ok) {
        console.error("[TriggerSequence] Failed to execute sequence for", dest.groupJid || "private", "Status:", executeResponse.status, "Body:", responseText);
        results.push({ groupJid: dest.groupJid, success: false, error: executeResult?.error || responseText });
        continue;
      }

      results.push({ groupJid: dest.groupJid, success: true, executeResult });
    }

    console.log(`[TriggerSequence] Sequence executed for ${results.length} destination(s):`, JSON.stringify(results).substring(0, 500));

    const anyFailed = results.some((r) => !r.success);
    const allFailed = results.length > 0 && results.every((r) => !r.success);

    if (allFailed) {
      return new Response(
        JSON.stringify({
          error: "Failed to execute sequence",
          details: results[0]?.error,
          results,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: anyFailed ? "Sequence triggered with some failures" : "Sequence triggered successfully",
        sequenceId: typedSequence.id,
        sequenceName: typedSequence.name,
        campaignId: typedCampaign.id,
        campaignName: typedCampaign.name,
        customFieldsApplied: Object.keys(customFields),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[TriggerSequence] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
