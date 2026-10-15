// Meta sends a form-encoded signed_request: base64url(HMAC_SHA256).base64url(JSON).
// Never trust the payload before checking the signature with the Criafy Instagram app secret.
export async function verifyMetaSignedRequest(req: Request): Promise<{ user_id: string }> {
  const secret = Deno.env.get("INSTAGRAM_APP_SECRET") || Deno.env.get("META_APP_SECRET");
  if (!secret) throw new Error("INSTAGRAM_APP_SECRET is not configured");
  const form = await req.formData();
  const signed = form.get("signed_request");
  if (typeof signed !== "string") throw new Error("Missing signed_request");
  const [signaturePart, payloadPart, extra] = signed.split(".");
  if (!signaturePart || !payloadPart || extra) throw new Error("Malformed signed_request");
  const decode = (s: string): Uint8Array => {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  };
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart)));
  const provided = decode(signaturePart);
  let mismatch = provided.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ (provided[i] ?? 0);
  if (mismatch !== 0) throw new Error("Invalid signed_request signature");
  const payload = JSON.parse(new TextDecoder().decode(decode(payloadPart)));
  if (payload.algorithm !== "HMAC-SHA256" || typeof payload.user_id !== "string" || !/^[0-9]+$/.test(payload.user_id))
    throw new Error("Invalid signed_request payload");
  return { user_id: payload.user_id };
}

export function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase environment is not configured");
  return { url, key };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
