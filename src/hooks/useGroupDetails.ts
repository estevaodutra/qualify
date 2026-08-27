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

export function useGroupDetails(groupIdOrJid: string | null, searchParticipant = "", page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["group_details", groupIdOrJid, searchParticipant, page, pageSize],
    queryFn: async () => {
      if (!groupIdOrJid) return { participants: [], allParticipants: [], totalCount: 0, totalPages: 1 };

      // 1. Resolve group_campaign_id from group_campaigns table by id or group_jid
      let targetCampaignId = groupIdOrJid;

      try {
        const { data: gcRow } = await supabase
          .from("group_campaigns")
          .select("id")
          .eq("group_jid", groupIdOrJid)
          .maybeSingle();

        if (gcRow?.id) {
          targetCampaignId = gcRow.id;
        }
      } catch (_e) {
        // Fallback to original ID
      }

      // 2. Query group_members by group_campaign_id matching schema
      let { data: rawMembers } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_campaign_id", targetCampaignId);

      // Fallback query if rawMembers is empty
      if (!rawMembers || rawMembers.length === 0) {
        const { data: altMembers } = await supabase
          .from("group_members")
          .select("*")
          .eq("group_campaign_id", groupIdOrJid);
        if (altMembers && altMembers.length > 0) {
          rawMembers = altMembers;
        }
      }

      const list = rawMembers || [];

      let participants: GroupParticipant[] = list.map((m: any) => ({
        id: m.id || m.phone,
        phone: m.phone || "",
        lid: m.lid || null,
        name: m.name || null,
        profilePhoto: m.profile_photo || null,
        role: m.is_admin ? "admin" : "member",
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
