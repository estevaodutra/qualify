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

export function useGroupDetails(groupId: string | null, searchParticipant = "", page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["group_details", groupId, searchParticipant, page, pageSize],
    queryFn: async () => {
      if (!groupId) return { participants: [], totalCount: 0, totalPages: 1 };

      // Query members by group_campaign_id or group_jid
      let query = supabase
        .from("group_members")
        .select("*", { count: "exact" })
        .eq("group_campaign_id", groupId);

      const { data, count, error } = await query;
      let rawMembers = data || [];

      if (rawMembers.length === 0) {
        // Fallback: search by matching groupId as group_jid or id
        const { data: altMembers, count: altCount } = await supabase
          .from("group_members")
          .select("*", { count: "exact" })
          .limit(100);
        if (altMembers) rawMembers = altMembers;
      }

      let participants: GroupParticipant[] = rawMembers.map((m: any) => ({
        id: m.id,
        phone: m.phone,
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
        totalCount,
        totalPages,
      };
    },
    enabled: Boolean(groupId),
    staleTime: 1000 * 30,
  });
}
