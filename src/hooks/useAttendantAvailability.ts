import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export function useAttendantAvailability(attendantId: string | null) {
  const qc = useQueryClient();
  const listQ = useQuery({
    queryKey: ["scheduling_availability", attendantId],
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      if (!attendantId) return [];
      const { data, error } = await (supabase as any)
        .from("scheduling_availability")
        .select("*")
        .eq("attendant_id", attendantId)
        .order("day_of_week");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        day_of_week: r.day_of_week,
        start_time: String(r.start_time).slice(0, 5),
        end_time: String(r.end_time).slice(0, 5),
      }));
    },
    enabled: !!attendantId,
  });

  const save = useMutation({
    mutationFn: async (slots: AvailabilitySlot[]) => {
      if (!attendantId) throw new Error("Atendente obrigatório");
      await (supabase as any).from("scheduling_availability").delete().eq("attendant_id", attendantId);
      if (slots.length > 0) {
        const { error } = await (supabase as any).from("scheduling_availability").insert(
          slots.map((s) => ({
            attendant_id: attendantId,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduling_availability", attendantId] }),
  });

  return { slots: listQ.data || [], isLoading: listQ.isLoading, save };
}

export function useAttendantCalendars(attendantId: string | null) {
  const qc = useQueryClient();
  const linksQ = useQuery({
    queryKey: ["attendant_calendars", attendantId],
    queryFn: async (): Promise<string[]> => {
      if (!attendantId) return [];
      const { data, error } = await (supabase as any)
        .from("scheduling_calendar_attendants")
        .select("calendar_id")
        .eq("attendant_id", attendantId);
      if (error) throw error;
      return (data || []).map((r: any) => r.calendar_id);
    },
    enabled: !!attendantId,
  });

  const save = useMutation({
    mutationFn: async (calendarIds: string[]) => {
      if (!attendantId) throw new Error("Atendente obrigatório");
      await (supabase as any).from("scheduling_calendar_attendants").delete().eq("attendant_id", attendantId);
      if (calendarIds.length > 0) {
        const { error } = await (supabase as any)
          .from("scheduling_calendar_attendants")
          .insert(calendarIds.map((cid) => ({ attendant_id: attendantId, calendar_id: cid })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendant_calendars", attendantId] });
      qc.invalidateQueries({ queryKey: ["scheduling_calendar_details"] });
    },
  });

  return { calendarIds: linksQ.data || [], isLoading: linksQ.isLoading, save };
}
