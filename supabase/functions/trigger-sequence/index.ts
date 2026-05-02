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
  instance_id: string;
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

    // Validate sequence is active and is webhook type
    if (!typedSequence.active) {
      return new Response(
        JSON.stringify({ error: "Sequence is not active", sequenceId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typedSequence.trigger_type !== "webhook") {
      return new Response(
        JSON.stringify({ 
          error: "Sequence is not configured for webhook trigger", 
          sequenceId,
          currentTriggerType: typedSequence.trigger_type
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the campaign to get campaign ID
    const { data: campaign, error: campaignError } = await supabase
      .from("group_campaigns")
      .select("id, name, instance_id")
      .eq("id", typedSequence.group_campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error("[TriggerSequence] Campaign not found:", campaignError);
      return new Response(
        JSON.stringify({ error: "Associated campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedCampaign = campaign as GroupCampaign;

    // Apply field mappings from trigger_config
    const triggerConfig = typedSequence.trigger_config || {};
    const fieldMappings = triggerConfig.fieldMappings || [];
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
    
    // Build trigger context with custom fields
    const triggerContext: Record<string, unknown> = {
      respondentPhone: destinationPhone,
      respondentName: extractField(payload, "name") || extractField(payload, "user.name") || "",
      respondentJid: destinationPhone ? `${destinationPhone}@s.whatsapp.net` : "",
      groupJid: "",
      sendPrivate: true, // Always single execution for webhook triggers
      customFields,
    };

    // When no phone provided, use first campaign group as single destination
    if (!destinationPhone) {
      const { data: firstGroup } = await supabase
        .from("campaign_groups")
        .select("group_jid, group_name")
        .eq("campaign_id", typedCampaign.id)
        .limit(1)
        .single();

      if (firstGroup) {
        triggerContext.respondentJid = firstGroup.group_jid;
        triggerContext.respondentName = firstGroup.group_name || "";
        triggerContext.groupJid = firstGroup.group_jid;
      }
      console.log(`[TriggerSequence] No phone in payload, using first group as destination: ${firstGroup?.group_jid}`);
    }

    console.log(`[TriggerSequence] Trigger context built, sendPrivate: ${triggerContext.sendPrivate}`);

    // Call execute-message to run the sequence
    const executePayload = {
      campaignId: typedCampaign.id,
      sequenceId: typedSequence.id,
      triggerContext,
    };

    console.log(`[TriggerSequence] Calling execute-message with:`, JSON.stringify(executePayload).substring(0, 500));

    const { data: executeResult, error: executeError } = await supabase.functions.invoke(
      "execute-message",
      { body: executePayload }
    );

    if (executeError) {
      console.error("[TriggerSequence] Failed to execute sequence:", executeError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to execute sequence",
          details: executeError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[TriggerSequence] Sequence executed successfully:`, executeResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sequence triggered successfully",
        sequenceId: typedSequence.id,
        sequenceName: typedSequence.name,
        campaignId: typedCampaign.id,
        campaignName: typedCampaign.name,
        customFieldsApplied: Object.keys(customFields),
        executeResult,
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
