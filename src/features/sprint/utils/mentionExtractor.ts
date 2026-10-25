export interface MentionableMember {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
}

/**
 * Extrai os IDs dos usuários mencionados em um texto (ex: "@Admin", "@pedro", etc.),
 * combinando com os membros selecionados via autocomplete dropdown.
 */
export function extractMentionedUserIds(
  text: string,
  members: MentionableMember[],
  explicitlySelectedMembers: Array<{ user_id: string }> = []
): string[] {
  const result = new Set<string>();

  // 1. Membros explicitamente selecionados no autocomplete
  explicitlySelectedMembers.forEach((m) => {
    if (m?.user_id) result.add(m.user_id);
  });

  if (!text || !members.length) {
    return Array.from(result);
  }

  // 2. Extrair menções que começam com @ no texto
  // Ex: @Admin, @Lucas_Silva, @pedro.costa, @"Lucas Silva"
  const regex = /@([a-zA-Z0-9À-ÿ_.-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawQuery = match[1]?.trim().toLowerCase();
    if (!rawQuery) continue;

    const matchedMember = members.find((m) => {
      if (!m.user_id) return false;
      const fullName = (m.full_name || "").toLowerCase();
      const emailPrefix = (m.email || "").split("@")[0].toLowerCase();
      const firstName = fullName.split(" ")[0] || "";

      // Match direto no primeiro nome, nome completo (sem espaços) ou prefixo do e-mail
      return (
        rawQuery === fullName ||
        rawQuery === firstName ||
        rawQuery === emailPrefix ||
        fullName.replace(/\s+/g, "") === rawQuery ||
        fullName.startsWith(rawQuery)
      );
    });

    if (matchedMember) {
      result.add(matchedMember.user_id);
    }
  }

  return Array.from(result);
}
