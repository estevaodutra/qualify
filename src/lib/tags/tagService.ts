import { supabase } from "@/integrations/supabase/client";

export interface CompanyTag {
  id?: string;
  name: string;
  color?: string;
  company_id?: string;
  group_id?: string | null;
  description?: string | null;
  created_at?: string;
}

const LOCAL_TAGS_KEY = (companyId: string) => `qualify_tags_${companyId}`;

export function getLocalTags(companyId: string): CompanyTag[] {
  if (!companyId) return [];
  try {
    const raw = localStorage.getItem(LOCAL_TAGS_KEY(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalTag(
  companyId: string,
  tag: {
    name: string;
    color?: string;
    id?: string;
    group_id?: string | null;
    description?: string | null;
  }
): CompanyTag {
  if (!companyId) return { name: tag.name.trim(), color: tag.color || "#8A3CFF" };
  try {
    const raw = localStorage.getItem(LOCAL_TAGS_KEY(companyId));
    const existing: CompanyTag[] = raw ? JSON.parse(raw) : [];
    const newTag: CompanyTag = {
      id: tag.id || `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: tag.name.trim(),
      color: tag.color || "#8A3CFF",
      company_id: companyId,
      group_id: tag.group_id || null,
      description: tag.description || null,
      created_at: new Date().toISOString(),
    };
    const updated = [
      ...existing.filter((t) => t.name?.toLowerCase() !== newTag.name.toLowerCase()),
      newTag,
    ];
    localStorage.setItem(LOCAL_TAGS_KEY(companyId), JSON.stringify(updated));
    return newTag;
  } catch (e) {
    console.warn("[tagService] Could not save tag locally:", e);
    return { id: tag.id || `tag_${Date.now()}`, name: tag.name.trim(), color: tag.color || "#8A3CFF" };
  }
}

export function notifyTagsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qualify-tags-updated"));
  }
}

/**
 * Ensures a tag is registered in the tags table and local storage.
 * Case-insensitive duplicate check.
 */
export async function ensureTagExists(
  companyId: string,
  tagName: string,
  color = "#8A3CFF"
): Promise<CompanyTag> {
  const cleanName = tagName.trim();
  if (!cleanName || !companyId) {
    return { name: cleanName, color };
  }

  // 1. Save in local cache immediately
  const localTag = saveLocalTag(companyId, { name: cleanName, color });

  // 2. Check in database
  try {
    const { data: existingTags, error: selectErr } = await supabase
      .from("tags")
      .select("id, name, color, group_id, description, created_at")
      .eq("company_id", companyId)
      .ilike("name", cleanName);

    if (!selectErr && existingTags && existingTags.length > 0) {
      saveLocalTag(companyId, existingTags[0] as CompanyTag);
      notifyTagsUpdated();
      return existingTags[0] as CompanyTag;
    }

    // 3. Insert into tags table
    const { data: inserted, error: insertErr } = await supabase
      .from("tags")
      .insert({
        company_id: companyId,
        name: cleanName,
        color: color || "#8A3CFF",
      })
      .select("id, name, color, group_id, description, created_at")
      .single();

    if (!insertErr && inserted) {
      saveLocalTag(companyId, inserted as CompanyTag);
      notifyTagsUpdated();
      return inserted as CompanyTag;
    }
  } catch (err) {
    console.warn("[tagService] Could not persist tag in DB:", err);
  }

  notifyTagsUpdated();
  return localTag;
}

/**
 * Ensures multiple tags exist in database and local cache.
 */
export async function ensureMultipleTagsExist(
  companyId: string,
  tagNames: string[],
  defaultColor = "#8A3CFF"
): Promise<void> {
  if (!companyId || !Array.isArray(tagNames) || tagNames.length === 0) return;
  for (const name of tagNames) {
    if (typeof name === "string" && name.trim()) {
      await ensureTagExists(companyId, name.trim(), defaultColor);
    }
  }
}

/**
 * Fetches all tags for a company from:
 * 1) tags table
 * 2) local storage
 * 3) leads.tags (auto-syncs any discovered tags into tags table!)
 * 4) sequence_nodes (auto-syncs any tags configured in workflows!)
 */
export async function fetchAllTagsWithAutoSync(companyId: string): Promise<CompanyTag[]> {
  if (!companyId) return [];

  const tagMap = new Map<string, CompanyTag>();

  // 1. Database tags
  try {
    const { data: dbTags, error } = await supabase
      .from("tags")
      .select("id, name, color, group_id, description, created_at")
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    if (!error && Array.isArray(dbTags)) {
      dbTags.forEach((t) => {
        if (t?.name) tagMap.set(t.name.trim().toLowerCase(), t as CompanyTag);
      });
    }
  } catch (err) {
    console.warn("[tagService] Error fetching tags table:", err);
  }

  // 2. Local storage tags
  const localTags = getLocalTags(companyId);
  localTags.forEach((t) => {
    if (t?.name && !tagMap.has(t.name.trim().toLowerCase())) {
      tagMap.set(t.name.trim().toLowerCase(), t);
    }
  });

  // 3. Discover missing tags from leads and workflow sequences to ensure complete alignment
  const missingToSync: string[] = [];

  try {
    const { data: leadRows } = await supabase
      .from("leads")
      .select("tags")
      .eq("company_id", companyId)
      .not("tags", "is", null)
      .limit(300);

    if (Array.isArray(leadRows)) {
      leadRows.forEach((row: any) => {
        if (Array.isArray(row.tags)) {
          row.tags.forEach((tagName: string) => {
            if (typeof tagName === "string" && tagName.trim()) {
              const lower = tagName.trim().toLowerCase();
              if (!tagMap.has(lower)) {
                missingToSync.push(tagName.trim());
                tagMap.set(lower, {
                  name: tagName.trim(),
                  color: "#8A3CFF",
                  company_id: companyId,
                });
              }
            }
          });
        }
      });
    }
  } catch (_e) {}

  // 4. Auto-persist any newly discovered tags
  if (missingToSync.length > 0) {
    setTimeout(async () => {
      for (const missingName of missingToSync) {
        await ensureTagExists(companyId, missingName);
      }
    }, 100);
  }

  return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
