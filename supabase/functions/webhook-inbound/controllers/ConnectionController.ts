import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { triggerSystemWebhook } from "../../_shared/system-webhook.ts";
import { type EventContext, type ClassificationResult } from "../../_shared/event-classifier.ts";

export async function processConnectionEvent(
  supabase: SupabaseClient,
  instance: any,
  classification: ClassificationResult,
  context: EventContext,
  rawEvent: any
) {
  if (classification.eventType === "connection_status" && instance?.id) {
    const eventBody = (rawEvent.body as Record<string, unknown>) || rawEvent;
    const payloadObj = eventBody?.payload as Record<string, unknown> | undefined;
    
    let newStatus: "connected" | "disconnected" | "waiting connection" = "disconnected";
    let statusResolved = false;

    if (eventBody?.connected !== undefined) {
      newStatus = eventBody.connected ? "connected" : "disconnected";
      statusResolved = true;
    } else if (rawEvent.connected !== undefined) {
      newStatus = rawEvent.connected ? "connected" : "disconnected";
      statusResolved = true;
    } else {
      const statusRaw = (eventBody?.status || payloadObj?.status || payloadObj?.state || (rawEvent as any).status) as string | undefined;
      if (statusRaw) {
        const s = statusRaw.toUpperCase();
        if (s === "WORKING" || s === "CONNECTED" || s === "CONNECTED_TO_WHATSAPP") {
          newStatus = "connected";
          statusResolved = true;
        } else if (s === "SCAN_QR_CODE" || s === "WAITING_FOR_QR" || s === "WAITING CONNECTION") {
          newStatus = "waiting connection";
          statusResolved = true;
        } else if (s === "STOPPED" || s === "FAILED" || s === "DISCONNECTED" || s === "UNPAIRED") {
          newStatus = "disconnected";
          statusResolved = true;
        } else if (s === "STARTING" || s === "INITIALIZING" || s === "CONNECTING" || s === "RESUMING") {
          // Estados transitórios de inicialização/reconexão: NÃO desconectar a instância bruscamente
          console.log(`[ConnectionController] Ignoring transient state ${s} for instance ${instance.id}`);
          statusResolved = false;
        } else {
          // Status desconhecido: manter o status atual para evitar desconexões indevidas
          statusResolved = false;
        }
      } else {
        const typeStr = String(eventBody?.type || rawEvent.type || "").toUpperCase();
        if (typeStr === "CONNECTEDCALLBACK" || typeStr === "CONNECTED") {
          newStatus = "connected";
          statusResolved = true;
        } else if (typeStr === "DISCONNECTEDCALLBACK" || typeStr === "DISCONNECTED") {
          newStatus = "disconnected";
          statusResolved = true;
        }
      }
    }

    if (statusResolved) {
      const statusChanged = newStatus !== instance.status;
      console.log(`[ConnectionController] Updating instance ${instance.id} status to ${newStatus} (changed: ${statusChanged})`);
      
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === "connected" && (eventBody?.phone || rawEvent.phone)) {
        updates.phone = eventBody?.phone || rawEvent.phone;
      }

      const { error: updateError } = await supabase
        .from("instances")
        .update(updates)
        .eq("id", instance.id);
        
      if (updateError) {
        console.error(`[ConnectionController] Failed to update instance status:`, updateError.message);
      }

      if (statusChanged && !updateError) {
        const eventId = newStatus === "connected" ? "instance.connected" : "instance.disconnected";
        
        await triggerSystemWebhook(supabase, eventId, {
          id: instance.id,
          name: instance.name,
          phone: newStatus === "connected" ? (eventBody?.phone || rawEvent.phone || instance.phone) : instance.phone,
          provider: instance.provider || "z-api",
          user_id: instance.user_id
        });
      }
    }
  }
}
