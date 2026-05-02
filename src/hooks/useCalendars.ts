import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export type CalendarModality = "call" | "video" | "in_person";
export type CalendarStatus = "active" | "paused";
export type CalendarDistribution = "round_robin" | "lead_choice";

export interface SchedulingCalendar {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  modality: CalendarModality;
  durationMinutes: number;
  color: string;
  distribution: CalendarDistribution;
  status: CalendarStatus;
  branding: Record<string, unknown>;
  texts: Record<string, unknown>;
  layout: Record<string, unknown>;
  advanced: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface DbCalendar {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  modality: string;
  duration_minutes: number;
  color: string;
  distribution: string;
  status: string;
  branding: Record<string, unknown>;
  texts: Record<string, unknown>;
  layout: Record<string, unknown>;
  advanced: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const transform = (db: DbCalendar): SchedulingCalendar => ({
  id: db.id,
  companyId: db.company_id,
  userId: db.user_id,
  name: db.name,
  slug: db.slug,
  description: db.description,
  modality: db.modality as CalendarModality,
  durationMinutes: db.duration_minutes,
  color: db.color,
  distribution: db.distribution as CalendarDistribution,
  status: db.status as CalendarStatus,
  branding: db.branding || {},
  texts: db.texts || {},
  layout: db.layout || {},
  advanced: db.advanced || {},
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export interface CreateCalendarInput {
  name: string;
  slug: string;
  description?: string | null;
  modality: CalendarModality;
  durationMinutes: number;
  color: string;
  distribution: CalendarDistribution;
  status?: CalendarStatus;
  branding?: Record<string, unknown>;
  texts?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  advanced?: Record<string, unknown>;
}

export function useCalendars() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  const { data: calendars = [], isLoading, refetch } = useQuery({
    queryKey: ["scheduling_calendars", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await (supabase as any)
        .from("scheduling_calendars")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DbCalendar[]).map(transform);
    },
    enabled: !!activeCompanyId,
  });

  const create = useMutation({
    mutationFn: async (input: CreateCalendarInput) => {
      if (!user || !activeCompanyId) throw new Error("Não autenticado");
      const { data, error } = await (supabase as any)
        .from("scheduling_calendars")
        .insert({
          company_id: activeCompanyId,
          user_id: user.id,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          modality: input.modality,
          duration_minutes: input.durationMinutes,
          color: input.color,
          distribution: input.distribution,
          status: input.status ?? "active",
          branding: input.branding ?? {},
          texts: input.texts ?? {},
          layout: input.layout ?? {},
          advanced: input.advanced ?? {},
        })
        .select()
        .single();
      if (error) throw error;
      return transform(data as DbCalendar);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_calendars"] });
      toast({ title: "Calendário criado" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateCalendarInput> & { id: string }) => {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name;
      if (input.slug !== undefined) payload.slug = input.slug;
      if (input.description !== undefined) payload.description = input.description;
      if (input.modality !== undefined) payload.modality = input.modality;
      if (input.durationMinutes !== undefined) payload.duration_minutes = input.durationMinutes;
      if (input.color !== undefined) payload.color = input.color;
      if (input.distribution !== undefined) payload.distribution = input.distribution;
      if (input.status !== undefined) payload.status = input.status;
      if (input.branding !== undefined) payload.branding = input.branding;
      if (input.texts !== undefined) payload.texts = input.texts;
      if (input.layout !== undefined) payload.layout = input.layout;
      if (input.advanced !== undefined) payload.advanced = input.advanced;

      const { data, error } = await (supabase as any)
        .from("scheduling_calendars")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return transform(data as DbCalendar);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_calendars"] });
      qc.invalidateQueries({ queryKey: ["scheduling_calendar_details"] });
      toast({ title: "Calendário atualizado" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("scheduling_calendars")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_calendars"] });
      toast({ title: "Calendário excluído" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    },
  });

  return { calendars, isLoading, refetch, create, update, remove };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
