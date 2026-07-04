// Rule-based lead qualification scoring. Only uses signals that are
// actually available in this pass (google_maps + website layers) --
// instagram/cnpj/corporate_structure are not implemented yet, so their
// criteria are simply omitted rather than counted as "false"/negative.
// Extending this once those layers land is additive: add new `if` checks,
// no schema/contract change needed (leads.qualification_score/_label stays
// the same shape).

export interface QualificationResult {
  score: number;
  label: "baixa" | "media" | "alta";
}

export function scoreLead(
  googleMaps: Record<string, any> | null | undefined,
  website: Record<string, any> | null | undefined
): QualificationResult {
  let score = 0;

  if (googleMaps?.phone || googleMaps?.phoneUnformatted) score++;
  if (website) score++;
  if (website?.email) score++;
  if (website?.whatsapp) score++;
  if (Array.isArray(website?.redes_sociais) && website.redes_sociais.length > 0) score++;
  if ((googleMaps?.reviewsCount ?? googleMaps?.totalScore?.count ?? 0) > 10) score++;
  if ((googleMaps?.totalScore ?? googleMaps?.rating ?? 0) >= 4) score++;

  const label: QualificationResult["label"] = score <= 2 ? "baixa" : score <= 4 ? "media" : "alta";
  return { score, label };
}
