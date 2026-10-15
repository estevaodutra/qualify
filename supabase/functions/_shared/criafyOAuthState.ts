export const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

export type CriafyOAuthProvider = "INSTAGRAM";

export interface CriafyOAuthStatePayload {
  companyId: string;
  userId: string;
  redirectUri: string;
  provider: CriafyOAuthProvider;
  nonce: string;
  issuedAt: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function createCriafyOAuthState(
  payload: Omit<CriafyOAuthStatePayload, "nonce" | "issuedAt">,
  secret: string,
  now = Date.now(),
  nonce = crypto.randomUUID()
): Promise<string> {
  if (!secret) throw new Error("OAuth state signing secret is not configured");

  const encodedPayload = toBase64Url(
    encoder.encode(JSON.stringify({ ...payload, nonce, issuedAt: now }))
  );
  return `${encodedPayload}.${await sign(encodedPayload, secret)}`;
}

export async function verifyCriafyOAuthState(
  state: string,
  secret: string,
  expected: Pick<CriafyOAuthStatePayload, "companyId" | "userId" | "redirectUri">,
  now = Date.now()
): Promise<CriafyOAuthStatePayload> {
  if (!state) throw new Error("OAuth state is required");
  if (!secret) throw new Error("OAuth state signing secret is not configured");

  const [encodedPayload, receivedSignature, extra] = state.split(".");
  if (!encodedPayload || !receivedSignature || extra) throw new Error("Invalid OAuth state format");

  const expectedSignature = await sign(encodedPayload, secret);
  const receivedBytes = encoder.encode(receivedSignature);
  const expectedBytes = encoder.encode(expectedSignature);
  let difference = receivedBytes.length ^ expectedBytes.length;
  const length = Math.max(receivedBytes.length, expectedBytes.length);
  for (let index = 0; index < length; index++) {
    difference |= (receivedBytes[index] || 0) ^ (expectedBytes[index] || 0);
  }
  if (difference !== 0) throw new Error("Invalid OAuth state signature");

  let payload: CriafyOAuthStatePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload)));
  } catch {
    throw new Error("Invalid OAuth state payload");
  }

  if (
    payload.companyId !== expected.companyId ||
    payload.userId !== expected.userId ||
    payload.redirectUri !== expected.redirectUri ||
    payload.provider !== "INSTAGRAM"
  ) {
    throw new Error("OAuth state does not match this authorization request");
  }
  if (!payload.nonce || !Number.isFinite(payload.issuedAt)) {
    throw new Error("OAuth state is incomplete");
  }
  if (payload.issuedAt > now + 60_000 || now - payload.issuedAt > OAUTH_STATE_MAX_AGE_MS) {
    throw new Error("OAuth state has expired");
  }

  return payload;
}
