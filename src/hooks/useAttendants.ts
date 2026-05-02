import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface SchedulingAttendant {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  bio: string | null;
  photoUrl: string | null;
  callOperatorId: string | null;
  linkedUserId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface DbAttendant {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  email: string | null;
  bio: string | null;
  photo_url: string | null;
  call_operator_id: string | null;
  linked_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

const transform = (d: DbAttendant): SchedulingAttendant => ({
  id: d.id,
  companyId: d.company_id,
  name: d.name,
  email: d.email,
  bio: d.bio,
  photoUrl: d.photo_url,
  callOperatorId: d.call_operator_id,
  linkedUserId: d.linked_user_id,
  isActive: d.is_active,
  createdAt: d.created_at,
});

export interface AttendantInput {
  name: string;
  email?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
}

export function useAttendants(includeInactive = false) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  const { data: attendants = [], isLoading } = useQuery({
    queryKey: ["scheduling_attendants", activeCompanyId, includeInactive],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let q = (supabase as any)
        .from("scheduling_attendants")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("name");
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data as DbAttendant[]).map(transform);
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (input: AttendantInput) => {
      if (!user || !activeCompanyId) throw new Error("Não autenticado");
      const { data, error } = await (supabase as any)
        .from("scheduling_attendants")
        .insert({
          company_id: activeCompanyId,
          user_id: user.id,
          name: input.name,
          email: input.email ?? null,
          bio: input.bio ?? null,
          photo_url: input.photoUrl ?? null,
          is_active: input.isActive ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return transform(data as DbAttendant);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_attendants"] });
      toast({ title: "Atendente criado" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao criar atendente", description: e.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: AttendantInput & { id: string }) => {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name;
      if (input.email !== undefined) payload.email = input.email;
      if (input.bio !== undefined) payload.bio = input.bio;
      if (input.photoUrl !== undefined) payload.photo_url = input.photoUrl;
      if (input.isActive !== undefined) payload.is_active = input.isActive;
      const { data, error } = await (supabase as any)
        .from("scheduling_attendants")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return transform(data as DbAttendant);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_attendants"] });
      toast({ title: "Atendente atualizado" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("scheduling_attendants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_attendants"] });
      toast({ title: "Atendente excluído" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    },
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      if (!activeCompanyId) throw new Error("Empresa não selecionada");
      const ext = file.name.split(".").pop();
      const path = `${activeCompanyId}/attendants/${crypto.randomUUID()}.${ext}`;
      const { error } = await (supabase as any).storage.from("scheduling-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = (supabase as any).storage.from("scheduling-assets").getPublicUrl(path);
      return data.publicUrl as string;
    },
  });

  return { attendants, isLoading, create, update, remove, uploadPhoto };
}
