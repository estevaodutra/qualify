import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GroupParticipant {
  id: string;
  phone: string;
  lid: string | null;
  name: string | null;
  profilePhoto: string | null;
  role: "superadmin" | "admin" | "member";
  joinedAt: string;
}

function normalizeJidKey(jid: string | null | undefined): string {
  if (!jid) return "";
  const str = String(jid).trim().toLowerCase();
  if (str.includes("@g.us")) return str;
  const digits = str.replace(/\D/g, "");
  return digits ? `${digits}@g.us` : str;
}

export function useGroupDetails(groupIdOrJid: string | null, searchParticipant = "", page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["group_details", groupIdOrJid, searchParticipant, page, pageSize],
    queryFn: async () => {
      if (!groupIdOrJid) return { participants: [], allParticipants: [], totalCount: 0, totalPages: 1 };

      const jidKey = normalizeJidKey(groupIdOrJid);

      // 1. Primary query by normalized group_jid
      let { data: rawMembers } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_jid", jidKey);

      // 2. Fallback query by exact groupIdOrJid
      if (!rawMembers || rawMembers.length === 0) {
        const { data: rawByOriginal } = await supabase
          .from("group_members")
          .select("*")
          .eq("group_jid", groupIdOrJid);
        if (rawByOriginal && rawByOriginal.length > 0) {
          rawMembers = rawByOriginal;
        }
      }

      // 3. Fallback query by group_campaign_id
      if (!rawMembers || rawMembers.length === 0) {
        const { data: rawByCampaign } = await supabase
          .from("group_members")
          .select("*")
          .eq("group_campaign_id", groupIdOrJid);
        if (rawByCampaign && rawByCampaign.length > 0) {
          rawMembers = rawByCampaign;
        }
      }

      const list = rawMembers || [];

      let participants: GroupParticipant[] = list.map((m: any) => ({
        id: m.id || m.phone,
        phone: m.phone,
        lid: m.lid || null,
        name: m.name || null,
        profilePhoto: m.profile_photo || null,
        role: m.is_admin || m.role === "admin" ? "admin" : "member",
        joinedAt: m.joined_at || m.created_at || new Date().toISOString(),
      }));

      // Search participant filter
      if (searchParticipant.trim()) {
        const term = searchParticipant.toLowerCase().trim();
        participants = participants.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(term)) ||
            p.phone.includes(term) ||
            (p.lid && p.lid.toLowerCase().includes(term))
        );
      }

      const totalCount = participants.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const paginated = participants.slice((page - 1) * pageSize, page * pageSize);

      return {
        participants: paginated,
        allParticipants: participants,
        totalCount,
        totalPages,
      };
    },
    enabled: Boolean(groupIdOrJid),
    staleTime: 1000 * 5,
  });
}
