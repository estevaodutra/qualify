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
      if (!groupIdOrJid) return { participants: [], totalCount: 0, totalPages: 1 };

      const jidKey = normalizeJidKey(groupIdOrJid);

      // Query members matching group_jid or group_campaign_id
      let { data } = await supabase
        .from("group_members")
        .select("*")
        .or(`group_jid.eq.${groupIdOrJid},group_campaign_id.eq.${groupIdOrJid},group_jid.eq.${jidKey}`);

      let rawMembers = data || [];

      if (rawMembers.length === 0) {
        // Fallback: search all group_members limit 200
        const { data: altMembers } = await supabase
          .from("group_members")
          .select("*")
          .limit(200);
        if (altMembers) {
          rawMembers = altMembers.filter((m: any) =>
            m.group_jid === groupIdOrJid ||
            m.group_campaign_id === groupIdOrJid ||
            normalizeJidKey(m.group_jid) === jidKey
          );
        }
      }

      let participants: GroupParticipant[] = rawMembers.map((m: any) => ({
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
