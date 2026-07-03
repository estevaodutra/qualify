const SENSITIVE_KEY_PATTERN = /^(authorization|apikey|api_key|token|password|secret|accesstoken|refreshtoken|cookie)$/i;

// Recursively masks values whose key looks sensitive, so the workflow
// execution inspector never renders raw credentials/tokens it happens to
// have captured as node input/output.
export function maskSensitiveData(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveData(item, seen));
  }
  if (value && typeof value === "object") {
    if (seen.has(value as object)) return "[circular]";
    seen.add(value as object);
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? "••••••••" : maskSensitiveData(val, seen);
    }
    return result;
  }
  return value;
}
