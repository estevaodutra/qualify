export type PhoneType = "mobile" | "landline" | "both" | "unknown" | "none";

export interface ClassifiedPhone {
  raw: string;
  digits: string;
  normalized: string;
  formatted: string;
  type: "mobile" | "landline" | "unknown";
  isWhatsapp: boolean;
}

export interface ResolvedPhones {
  mainPhone: string | null;
  telefoneFixo: string | null;
  isWhatsapp: boolean;
  type: PhoneType;
}

export function cleanPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function formatBrazilianPhone(clean: string): string {
  if (clean.length === 13 && clean.startsWith("55")) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12 && clean.startsWith("55")) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  if (clean.length === 11) {
    if (clean.startsWith("0800") || clean.startsWith("0300")) {
      return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
    }
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return clean;
}

export function classifyPhone(rawPhone: string | null | undefined): ClassifiedPhone | null {
  if (!rawPhone) return null;
  const digits = cleanPhoneDigits(rawPhone);
  if (!digits || digits.length < 8) return null;

  // Normalization for Brazil:
  // If starts with 0 + DDD, e.g. 011987654321 (12 digits) or 01132145500 (11 digits)
  let normalizedDigits = digits;
  if (normalizedDigits.length === 12 && normalizedDigits.startsWith("0") && !normalizedDigits.startsWith("0800") && !normalizedDigits.startsWith("0300")) {
    normalizedDigits = normalizedDigits.slice(1);
  }
  if (normalizedDigits.length === 11 && normalizedDigits.startsWith("0") && !normalizedDigits.startsWith("0800") && !normalizedDigits.startsWith("0300")) {
    normalizedDigits = normalizedDigits.slice(1);
  }

  // Prepend 55 if not present on 10 or 11 digits
  let withCountryCode = normalizedDigits;
  if (!withCountryCode.startsWith("55") && (withCountryCode.length === 10 || withCountryCode.length === 11)) {
    withCountryCode = `55${withCountryCode}`;
  }

  // Brazil 13 digits (55 + 2 DDD + 9 local digits)
  if (withCountryCode.length === 13 && withCountryCode.startsWith("55")) {
    const localFirstDigit = withCountryCode.slice(4, 5);
    const isMobile = localFirstDigit === "9";
    return {
      raw: rawPhone,
      digits: normalizedDigits,
      normalized: withCountryCode,
      formatted: formatBrazilianPhone(withCountryCode),
      type: isMobile ? "mobile" : "landline",
      isWhatsapp: isMobile,
    };
  }

  // Brazil 12 digits (55 + 2 DDD + 8 local digits)
  if (withCountryCode.length === 12 && withCountryCode.startsWith("55")) {
    const localFirstDigit = withCountryCode.slice(4, 5);
    const isLandline = ["2", "3", "4", "5"].includes(localFirstDigit) || localFirstDigit !== "9";
    return {
      raw: rawPhone,
      digits: normalizedDigits,
      normalized: withCountryCode,
      formatted: formatBrazilianPhone(withCountryCode),
      type: isLandline ? "landline" : "mobile",
      isWhatsapp: !isLandline,
    };
  }

  // Toll-free / 0800
  if (normalizedDigits.startsWith("0800") || normalizedDigits.startsWith("0300")) {
    return {
      raw: rawPhone,
      digits: normalizedDigits,
      normalized: normalizedDigits,
      formatted: formatBrazilianPhone(normalizedDigits),
      type: "landline",
      isWhatsapp: false,
    };
  }

  // International or unknown length
  return {
    raw: rawPhone,
    digits: normalizedDigits,
    normalized: normalizedDigits,
    formatted: rawPhone.trim(),
    type: "unknown",
    isWhatsapp: true,
  };
}

export function resolveLeadPhones(rawLead: Record<string, unknown>): ResolvedPhones {
  const candidates: string[] = [];

  // 1. Check whatsapp explicitly
  if (typeof rawLead.whatsapp === "string" && rawLead.whatsapp.trim()) {
    candidates.push(rawLead.whatsapp.trim());
  }
  if (typeof rawLead.mobile === "string" && rawLead.mobile.trim()) {
    candidates.push(rawLead.mobile.trim());
  }
  if (typeof rawLead.phone === "string" && rawLead.phone.trim()) {
    candidates.push(rawLead.phone.trim());
  }
  if (typeof rawLead.phoneUnformatted === "string" && rawLead.phoneUnformatted.trim()) {
    candidates.push(rawLead.phoneUnformatted.trim());
  }
  if (Array.isArray(rawLead.phones)) {
    for (const p of rawLead.phones) {
      if (typeof p === "string" && p.trim()) candidates.push(p.trim());
    }
  }

  // Classify all candidates and deduplicate by normalized string
  const classifiedMap = new Map<string, ClassifiedPhone>();
  for (const raw of candidates) {
    const classified = classifyPhone(raw);
    if (classified && !classifiedMap.has(classified.normalized)) {
      classifiedMap.set(classified.normalized, classified);
    }
  }

  const classifiedList = Array.from(classifiedMap.values());
  if (classifiedList.length === 0) {
    return { mainPhone: null, telefoneFixo: null, isWhatsapp: false, type: "none" };
  }

  const mobiles = classifiedList.filter((c) => c.type === "mobile");
  const landlines = classifiedList.filter((c) => c.type === "landline");
  const unknowns = classifiedList.filter((c) => c.type === "unknown");

  // If we have both mobile and landline
  if (mobiles.length > 0 && landlines.length > 0) {
    return {
      mainPhone: mobiles[0].normalized,
      telefoneFixo: landlines[0].formatted,
      isWhatsapp: true,
      type: "both",
    };
  }

  // If only mobiles exist
  if (mobiles.length > 0) {
    return {
      mainPhone: mobiles[0].normalized,
      telefoneFixo: null,
      isWhatsapp: true,
      type: "mobile",
    };
  }

  // If only landlines exist
  if (landlines.length > 0) {
    return {
      mainPhone: landlines[0].normalized,
      telefoneFixo: landlines[0].formatted,
      isWhatsapp: false,
      type: "landline",
    };
  }

  // Fallback to unknown / international
  const first = unknowns[0] || classifiedList[0];
  return {
    mainPhone: first.normalized,
    telefoneFixo: null,
    isWhatsapp: first.isWhatsapp,
    type: "unknown",
  };
}
