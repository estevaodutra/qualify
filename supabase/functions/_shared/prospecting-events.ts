// Append-only prospecting lifecycle/timeline log (prospecting_events).
// Mirrors the non-fatal, try/catch-swallowed convention of
// workflow-execution-log.ts's logNodeExecution -- a logging failure must
// never interrupt the prospecting pipeline itself.

export type ProspectingEventType =
  | "prospecting.created"
  | "prospecting.started"
  | "prospecting.extraction_completed"
  | "prospecting.validation_completed"
  | "prospecting.enrichment_started"
  | "prospecting.enrichment_completed"
  | "prospecting.awaiting_approval"
  | "prospecting.approved"
  | "prospecting.queue_created"
  | "prospecting.completed"
  | "prospecting.failed"
  | "prospecting.cancelled"
  | "prospecting.lead_found"
  | "prospecting.lead_validated"
  | "prospecting.lead_deduplicated"
  | "prospecting.lead_enriched"
  | "prospecting.lead_queued"
  | "prospecting.lead_dispatched"
  | "prospecting.lead_replied"
  | "prospecting.lead_failed"
  | "prospecting.daily_limit_hit"
  | "prospecting.instance_disconnected"
  | "prospecting.duplicate_callback_ignored";

export async function logProspectingEvent(
  supabase: any,
  params: {
    companyId: string | null;
    campaignId: string;
    leadId?: string | null;
    eventType: ProspectingEventType;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from("prospecting_events").insert({
      company_id: params.companyId,
      prospecting_campaign_id: params.campaignId,
      lead_id: params.leadId ?? null,
      event_type: params.eventType,
      payload: params.payload ?? {},
    });
  } catch (err) {
    console.error("[ProspectingEvents] logProspectingEvent failed (non-fatal):", err);
  }
}
