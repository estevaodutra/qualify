import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PhoneNumberStatus = "active" | "paused" | "banned" | "warming";
export type PhoneNumberType = "whatsapp_business" | "whatsapp_normal";

export interface PhoneNumber {
  id: string;
  userId: string;
  instanceId: string | null;
  number: string;
  type: PhoneNumberType;
  provider: string;
  status: PhoneNumberStatus;
  health: number;
  cycleUsed: number;
  cycleTotal: number;
  lastUsedAt: string | null;
  connected: boolean;
  createdAt: string;
}

interface DbPhoneNumber {
  id: string;
  user_id: string;
  instance_id: string | null;
  number: string;
  type: string;
  provider: string;
  status: string;
  health: number;
  cycle_used: number;
  cycle_total: number;
  last_used_at: string | null;
  connected: boolean;
  created_at: string;
}

function transformDbToFrontend(db: DbPhoneNumber): PhoneNumber {
  return {
    id: db.id,
    userId: db.user_id,
    instanceId: db.instance_id,
    number: db.number,
    type: db.type as PhoneNumberType,
    provider: db.provider,
    status: db.status as PhoneNumberStatus,
    health: db.health,
    cycleUsed: db.cycle_used,
    cycleTotal: db.cycle_total,
    lastUsedAt: db.last_used_at,
    connected: db.connected,
    createdAt: db.created_at,
  };
}

export function usePhoneNumbers() {
  const queryClient = useQueryClient();

  const { data: phoneNumbers = [], isLoading, error, refetch } = useQuery({
    queryKey: ["phone_numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as DbPhoneNumber[]).map(transformDbToFrontend);
    },
  });

  const createPhoneNumberMutation = useMutation({
    mutationFn: async (newNumber: {
      number: string;
      type: PhoneNumberType;
      provider: string;
      instanceId?: string;
      status?: PhoneNumberStatus;
      connected?: boolean;
      health?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("phone_numbers")
        .insert({
          user_id: user.id,
          instance_id: newNumber.instanceId || null,
          number: newNumber.number,
          type: newNumber.type,
          provider: newNumber.provider,
          status: newNumber.status || "warming",
          connected: newNumber.connected || false,
          health: newNumber.health || 50,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
    },
  });

  const updatePhoneNumberMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        number: string;
        type: PhoneNumberType;
        provider: string;
        status: PhoneNumberStatus;
        health: number;
        cycleUsed: number;
        cycleTotal: number;
        connected: boolean;
        instanceId: string | null;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.number !== undefined) dbUpdates.number = updates.number;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.provider !== undefined) dbUpdates.provider = updates.provider;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.health !== undefined) dbUpdates.health = updates.health;
      if (updates.cycleUsed !== undefined) dbUpdates.cycle_used = updates.cycleUsed;
      if (updates.cycleTotal !== undefined) dbUpdates.cycle_total = updates.cycleTotal;
      if (updates.connected !== undefined) dbUpdates.connected = updates.connected;
      if (updates.instanceId !== undefined) dbUpdates.instance_id = updates.instanceId;

      const { data, error } = await supabase
        .from("phone_numbers")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
    },
  });

  const deletePhoneNumberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("phone_numbers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
    },
  });

  const resetCycleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("phone_numbers")
        .update({ cycle_used: 0 })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
    },
  });

  // Ensure a phone number exists for an instance (upsert logic)
  const ensurePhoneNumberExists = async (params: {
    phone: string;
    provider: string;
    instanceId: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if number already exists for this user
    const { data: existing } = await supabase
      .from("phone_numbers")
      .select("id")
      .eq("number", params.phone)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { data } = await supabase
        .from("phone_numbers")
        .update({
          connected: true,
          status: "active",
          instance_id: params.instanceId,
          health: 100,
        })
        .eq("id", existing.id)
        .select()
        .single();
      
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
      return data;
    } else {
      // Create new record
      const { data } = await supabase
        .from("phone_numbers")
        .insert({
          user_id: user.id,
          instance_id: params.instanceId,
          number: params.phone,
          type: "whatsapp_normal",
          provider: params.provider,
          status: "active",
          connected: true,
          health: 100,
        })
        .select()
        .single();
      
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
      return data;
    }
  };

  // Sync phone numbers from connected instances
  const syncFromInstances = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Fetch connected instances with phone numbers
    const { data: instances, error: instancesError } = await supabase
      .from("instances")
      .select("id, phone, provider")
      .eq("user_id", user.id)
      .eq("status", "connected")
      .not("phone", "is", null);

    if (instancesError) throw instancesError;
    if (!instances || instances.length === 0) {
      return { synced: 0 };
    }

    let syncedCount = 0;
    for (const instance of instances) {
      if (!instance.phone) continue;

      // Check if already exists
      const { data: existing } = await supabase
        .from("phone_numbers")
        .select("id")
        .eq("number", instance.phone)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        // Create new record
        await supabase.from("phone_numbers").insert({
          user_id: user.id,
          instance_id: instance.id,
          number: instance.phone,
          type: "whatsapp_normal",
          provider: instance.provider,
          status: "active",
          connected: true,
          health: 100,
        });
        syncedCount++;
      } else {
        // Update existing record
        await supabase.from("phone_numbers")
          .update({
            connected: true,
            status: "active",
            instance_id: instance.id,
          })
          .eq("id", existing.id);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
    return { synced: syncedCount };
  };

  return {
    phoneNumbers,
    isLoading,
    error,
    refetch,
    createPhoneNumber: createPhoneNumberMutation.mutateAsync,
    updatePhoneNumber: updatePhoneNumberMutation.mutateAsync,
    deletePhoneNumber: deletePhoneNumberMutation.mutateAsync,
    resetCycle: resetCycleMutation.mutateAsync,
    ensurePhoneNumberExists,
    syncFromInstances,
    isCreating: createPhoneNumberMutation.isPending,
    isUpdating: updatePhoneNumberMutation.isPending,
    isDeleting: deletePhoneNumberMutation.isPending,
  };
}
