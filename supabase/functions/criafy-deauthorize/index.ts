import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMetaSignedRequest, supabaseAdmin, json } from "../_shared/criafy-meta-signed-request.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { user_id } = await verifyMetaSignedRequest(req);
    const { url, key } = supabaseAdmin();
    const db = createClient(url, key);
    // Identifiers must match a verified Instagram ID, not a username or company-provided ID.
    const { data, error } = await db.from("criafy_instagram_accounts")
      .select("id").or(`instagram_user_id.eq.${user_id},instagram_account_id.eq.${user_id}`);
    if (error) throw error;
    for (const row of data ?? []) {
      const { error: updateError } = await db.from("criafy_instagram_accounts")
        .update({ access_token: null, connection_status: "DISCONNECTED",
          error_message: "Instagram authorization revoked", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updateError) throw updateError;
      // Stop future scheduled jobs for the revoked account.
      const { error: cancelError } = await db.from("criafy_publications")
        .update({ status: "CANCELED", updated_at: new Date().toISOString() })
        .eq("account_id", row.id).eq("status", "SCHEDULED");
      if (cancelError) throw cancelError;
    }
    return json({ success: true });
  } catch (err: any) {
    // Do not expose signature validation internals or user identifiers.
    console.error("[Criafy deauthorization] Request rejected or failed:", err instanceof Error ? err.message : "unknown");
    const isValidationError =
      err?.message?.includes("signed_request") ||
      err?.message?.includes("signature") ||
      err?.message?.includes("Malformed") ||
      err?.message?.includes("form data") ||
      err?.message?.includes("Invalid signed_request");
    return json({ error: "Unable to process request" }, isValidationError ? 400 : 500);
  }
});
