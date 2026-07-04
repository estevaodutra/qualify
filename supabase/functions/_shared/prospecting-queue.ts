// Shared enqueue logic for the prospecting execution queue. Used by
// prospecting-callback (auto_start), prospecting-approve (review_before_start),
// and the "add leads to queue" manual action from the monitoring UI --
// keeping this in one place avoids duplicating the pre-queue validation
// rules across three call sites.

import { logProspectingEvent } from "./prospecting-events.ts";

interface ProspectingCampaignRow {
  id: string;
  company_id: string | null;
  user_id: string;
  automation_campaign_id: string | null;
  automation_sequence_id: string | null;
  instance_id: string | null;
  queue_policy: {
    allow_reentry?: boolean;
    [key: string]: unknown;
  } | null;
}

const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
};

export async function enqueueProspectingLeads(
  supabase: any,
  params: { campaign: ProspectingCampaignRow; leadIds: string[] }
): Promise<{ queued: number; skipped: number }> {
  const { campaign, leadIds } = params;

  if (!campaign.automation_campaign_id || !campaign.automation_sequence_id) {
    throw new Error("Campanha de prospecção não tem automação/sequência configurada.");
  }
  if (leadIds.length === 0) {
    return { queued: 0, skipped: 0 };
  }

  const allowReentry = campaign.queue_policy?.allow_reentry === true;

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, phone, status")
    .in("id", leadIds);

  if (leadsError) throw leadsError;

  const eligibleLeadIds = (leads ?? [])
    .filter((lead: any) => isValidPhone(lead.phone) && lead.status !== "blocked")
    .map((lead: any) => lead.id as string);

  let candidateLeadIds = eligibleLeadIds;

  if (!allowReentry && candidateLeadIds.length > 0) {
    const { data: alreadyRan } = await supabase
      .from("dispatch_campaign_contacts")
      .select("lead_id")
      .eq("campaign_id", campaign.automation_campaign_id)
      .eq("status", "completed")
      .in("lead_id", candidateLeadIds);

    const alreadyRanIds = new Set((alreadyRan ?? []).map((row: any) => row.lead_id as string));
    candidateLeadIds = candidateLeadIds.filter((id) => !alreadyRanIds.has(id));
  }

  const skipped = leadIds.length - candidateLeadIds.length;

  if (candidateLeadIds.length === 0) {
    return { queued: 0, skipped };
  }

  const rows = candidateLeadIds.map((leadId) => ({
    company_id: campaign.company_id,
    user_id: campaign.user_id,
    prospecting_campaign_id: campaign.id,
    lead_id: leadId,
    automation_campaign_id: campaign.automation_campaign_id,
    automation_sequence_id: campaign.automation_sequence_id,
    instance_id: campaign.instance_id,
    status: "pending",
    priority: 0,
    max_attempts: 3,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("prospecting_queue")
    .upsert(rows, {
      onConflict: "prospecting_campaign_id,lead_id,automation_sequence_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (insertError) throw insertError;

  const queuedCount = inserted?.length ?? 0;

  await logProspectingEvent(supabase, {
    companyId: campaign.company_id,
    campaignId: campaign.id,
    eventType: "prospecting.queue_created",
    payload: { queued: queuedCount, skipped: skipped + (candidateLeadIds.length - queuedCount) },
  });

  return { queued: queuedCount, skipped: skipped + (candidateLeadIds.length - queuedCount) };
}
