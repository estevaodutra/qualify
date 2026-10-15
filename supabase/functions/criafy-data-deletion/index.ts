import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMetaSignedRequest, supabaseAdmin, json } from "../_shared/criafy-meta-signed-request.ts";

Deno.serve(async (req) => {
  const { url, key } = supabaseAdmin();
  const db = createClient(url, key);

  // Public status endpoint contains no personal data. Confirmation IDs are unguessable UUIDs.
  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid confirmation code" }, 400);
    const { data, error } = await db.from("criafy_meta_deletion_requests")
      .select("status, requested_at, completed_at").eq("id", id).maybeSingle();
    if (error) return json({ error: "Unable to retrieve status" }, 500);
    if (!data) return json({ error: "Not found" }, 404);
    return json(data);
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { user_id } = await verifyMetaSignedRequest(req);
    const id = crypto.randomUUID();
    const { error: journalError } = await db.from("criafy_meta_deletion_requests")
      .insert({ id, meta_user_id: user_id, status: "PROCESSING" });
    if (journalError) throw journalError;

    const { data: accounts, error: accountError } = await db.from("criafy_instagram_accounts")
      .select("id").or(`instagram_user_id.eq.${user_id},instagram_account_id.eq.${user_id}`);
    if (accountError) throw accountError;
    // Foreign keys cascade briefings, schedules, publications and account-content links.
    // Company-owned shared media is deliberately retained, pending separate data policy review.
    for (const account of accounts ?? []) {
      const { error: deleteError } = await db.from("criafy_instagram_accounts").delete().eq("id", account.id);
      if (deleteError) throw deleteError;
    }
    const { error: completeError } = await db.from("criafy_meta_deletion_requests")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() }).eq("id", id);
    if (completeError) throw completeError;
  } catch (err: any) {
    console.error("[Criafy deletion] Request error:", err instanceof Error ? err.message : "unknown");
    const isValidationError =
      err?.message?.includes("signed_request") ||
      err?.message?.includes("signature") ||
      err?.message?.includes("Malformed") ||
      err?.message?.includes("form data") ||
      err?.message?.includes("Invalid signed_request");
    return json({ error: "Unable to process deletion request" }, isValidationError ? 400 : 500);
  }
});
