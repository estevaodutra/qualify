import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { BroadcastAudienceFilters } from "@/types/broadcast.types";

export function useBroadcastAudience(filters: BroadcastAudienceFilters) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const [previewPage, setPreviewPage] = useState(1);
  const previewLimit = 15;

  // Base query builder helper
  const applyFilters = (query: any) => {
    if (activeCompanyId) {
      query = query.or(`company_id.eq.${activeCompanyId},user_id.eq.${user?.id}`);
    } else if (user) {
      query = query.eq("user_id", user.id);
    }

    if (filters.search?.trim()) {
      const s = filters.search.trim();
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
    }

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.sourceGroupName && filters.sourceGroupName !== "all") {
      query = query.eq("source_group_name", filters.sourceGroupName);
    }

    if (filters.sourceType && filters.sourceType !== "all") {
      query = query.eq("source_type", filters.sourceType);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps("tags", filters.tags);
    }

    return query;
  };

  // 1. Fetch total matching leads count
  const countQuery = useQuery({
    queryKey: ["broadcast_audience_count", activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, phone, name", { count: "exact" });

      query = applyFilters(query);
      const { data, count, error } = await query;
      if (error) throw error;

      // Filter out non-lead group dummies
      const validLeads = (data || []).filter((l: any) => {
        const isGroup =
          (l.name && (l.name.includes("@g.us") || l.name.toLowerCase().includes("grupo whatsapp"))) ||
          (l.phone && (l.phone.startsWith("1203") || l.phone.includes("@g.us")));
        return !isGroup && !!l.phone;
      });

      return {
        total: validLeads.length,
        leadIds: validLeads.map((l: any) => l.id),
      };
    },
    enabled: !!user,
  });

  // 2. Fetch paginated preview of leads
  const previewQuery = useQuery({
    queryKey: ["broadcast_audience_preview", activeCompanyId, filters, previewPage],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, name, phone, email, tags, status, source_group_name, created_at")
        .order("created_at", { ascending: false });

      query = applyFilters(query);
      const from = (previewPage - 1) * previewLimit;
      const to = from + previewLimit - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).filter((l: any) => {
        const isGroup =
          (l.name && (l.name.includes("@g.us") || l.name.toLowerCase().includes("grupo whatsapp"))) ||
          (l.phone && (l.phone.startsWith("1203") || l.phone.includes("@g.us")));
        return !isGroup;
      });
    },
    enabled: !!user,
  });

  // 3. Fetch available tags for quick filter options
  const tagsQuery = useQuery({
    queryKey: ["broadcast_audience_tags", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("tags")
        .not("tags", "is", null);

      if (activeCompanyId) {
        query = query.or(`company_id.eq.${activeCompanyId},user_id.eq.${user?.id}`);
      } else if (user) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      const tagSet = new Set<string>();
      data?.forEach((row: any) => {
        if (Array.isArray(row.tags)) {
          row.tags.forEach((t: string) => {
            if (t && typeof t === "string") tagSet.add(t.trim());
          });
        }
      });
      return Array.from(tagSet).sort();
    },
    enabled: !!user,
  });

  // 4. Fetch available source groups for filter
  const groupsQuery = useQuery({
    queryKey: ["broadcast_audience_groups", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("source_group_name")
        .not("source_group_name", "is", null);

      if (activeCompanyId) {
        query = query.or(`company_id.eq.${activeCompanyId},user_id.eq.${user?.id}`);
      } else if (user) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      const groupSet = new Set<string>();
      data?.forEach((row: any) => {
        if (row.source_group_name?.trim()) {
          groupSet.add(row.source_group_name.trim());
        }
      });
      return Array.from(groupSet).sort();
    },
    enabled: !!user,
  });

  return {
    totalMatchingLeads: countQuery.data?.total || 0,
    matchedLeadIds: countQuery.data?.leadIds || [],
    isCountLoading: countQuery.isLoading,
    previewLeads: previewQuery.data || [],
    isPreviewLoading: previewQuery.isLoading,
    availableTags: tagsQuery.data || [],
    availableGroups: groupsQuery.data || [],
    previewPage,
    setPreviewPage,
    previewLimit,
  };
}
