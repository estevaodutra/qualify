// Thin wrapper around the existing in-app notification center (public.alerts)
// so prospecting milestones surface without a second notification system.

export type AlertSeverity = "info" | "warning" | "error" | "success";

export async function notifyProspecting(
  supabase: any,
  params: {
    companyId: string | null;
    userId?: string | null;
    severity: AlertSeverity;
    title: string;
    description: string;
    entity: string;
  }
): Promise<void> {
  try {
    await supabase.from("alerts").insert({
      company_id: params.companyId,
      user_id: params.userId ?? null,
      severity: params.severity,
      title: params.title,
      description: params.description,
      entity: params.entity,
      read: false,
    });
  } catch (err) {
    console.error("[ProspectingAlerts] notifyProspecting failed (non-fatal):", err);
  }
}
