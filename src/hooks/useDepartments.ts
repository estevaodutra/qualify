import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface Department {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  member_count?: number;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

export function useDepartments(overrideCompanyId?: string) {
  const { activeCompanyId } = useCompany();
  const companyId = overrideCompanyId || activeCompanyId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async (): Promise<Department[]> => {
      let q = (supabase as any)
        .from("departments")
        .select(`
          id,
          company_id,
          name,
          description,
          color,
          created_at,
          department_members ( id )
        `)
        .order("name", { ascending: true });

      if (companyId) {
        q = q.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      const { data, error } = await q;
      if (error) {
        console.warn("[useDepartments] Error fetching departments:", error);
        return [];
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        company_id: d.company_id,
        name: d.name,
        description: d.description,
        color: d.color || "#8A3CFF",
        created_at: d.created_at,
        member_count: Array.isArray(d.department_members) ? d.department_members.length : 0,
      }));
    },
  });

  const createDepartment = useMutation({
    mutationFn: async ({ name, description, color, companyIdOverride }: { name: string; description?: string; color?: string; companyIdOverride?: string }) => {
      const { data, error } = await (supabase as any)
        .from("departments")
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          color: color || "#8A3CFF",
          company_id: companyIdOverride !== undefined ? companyIdOverride : (companyId || null),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, name, description, color }: { id: string; name: string; description?: string; color?: string }) => {
      const { data, error } = await (supabase as any)
        .from("departments")
        .update({
          name: name.trim(),
          description: description?.trim() || null,
          color: color || "#8A3CFF",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("departments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  return {
    departments: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}

export function useDepartmentMembers(departmentId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["department-members", departmentId],
    enabled: !!departmentId,
    queryFn: async (): Promise<DepartmentMember[]> => {
      if (!departmentId) return [];

      const { data: deptMembers, error } = await (supabase as any)
        .from("department_members")
        .select("id, department_id, user_id, created_at")
        .eq("department_id", departmentId);

      if (error) {
        console.warn("[useDepartmentMembers] Error:", error);
        return [];
      }
      if (!deptMembers || deptMembers.length === 0) return [];

      const userIds = deptMembers.map((m: any) => m.user_id);
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return deptMembers.map((m: any) => {
        const prof = profileMap.get(m.user_id);
        return {
          id: m.id,
          department_id: m.department_id,
          user_id: m.user_id,
          created_at: m.created_at,
          user_name: prof?.full_name || null,
          user_email: prof?.email || null,
        };
      });
    },
  });

  const addMember = useMutation({
    mutationFn: async ({ userId, deptId }: { userId: string; deptId?: string }) => {
      const targetDeptId = deptId || departmentId;
      if (!targetDeptId) throw new Error("Department ID required");

      const { data, error } = await (supabase as any)
        .from("department_members")
        .insert({
          department_id: targetDeptId,
          user_id: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-members", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ userId, deptId }: { userId: string; deptId?: string }) => {
      const targetDeptId = deptId || departmentId;
      if (!targetDeptId) throw new Error("Department ID required");

      const { error } = await (supabase as any)
        .from("department_members")
        .delete()
        .eq("department_id", targetDeptId)
        .eq("user_id", userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-members", departmentId] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    addMember,
    removeMember,
  };
}
