import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Database instance type (matches Supabase schema)
interface DbInstance {
  id: string;
  name: string;
  phone: string;
  provider: string;
  status: string;
  created_at: string | null;
  last_message_at: string | null;
  messages_count: number | null;
  external_instance_id: string | null;
  external_instance_token: string | null;
  user_id: string | null;
  payment_status: string | null;
  expiration_date: string | null;
  instance_function: string;
}

// Frontend instance type
export type InstanceFunction = "dispatcher" | "admin" | "spy" | "funnel";
export interface Instance {
  id: string;
  name: string;
  provider: "Z-API" | "Evolution API" | "Meta Business API";
  function: InstanceFunction;
  status: "connected" | "disconnected" | "waitingConnection";
  health: number;
  dispatches: number;
  lastCheck: string;
  connectedNumber?: string;
  features: string[];
  documentation: string;
  phoneNumber?: string;
  idInstance?: string;
  tokenInstance?: string;
  paymentStatus?: string;
  expirationDate?: string;
}

// Map database status to frontend status
const mapDbStatusToFrontend = (dbStatus: string): Instance["status"] => {
  switch (dbStatus) {
    case "connected":
      return "connected";
    case "disconnected":
      return "disconnected";
    case "waiting connection":
      return "waitingConnection";
    default:
      return "disconnected";
  }
};

// Map frontend status to database status
export const mapFrontendStatusToDb = (frontendStatus: Instance["status"]): string => {
  switch (frontendStatus) {
    case "connected":
      return "connected";
    case "disconnected":
      return "disconnected";
    case "waitingConnection":
      return "waiting connection";
    default:
      return "disconnected";
  }
};

// Get relative time string
const getRelativeTime = (date: string | null): string => {
  if (!date) return "Never";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Get provider features
const getProviderFeatures = (provider: string): string[] => {
  switch (provider) {
    case "Z-API":
      return ["Text", "Media", "Templates", "Webhooks"];
    case "Evolution API":
      return ["Text", "Media", "Groups", "Status"];
    case "Meta Business API":
      return ["Official API", "Templates", "Analytics"];
    default:
      return ["Text", "Media"];
  }
};

// Get provider documentation URL
const getProviderDocumentation = (provider: string): string => {
  switch (provider) {
    case "Z-API":
      return "https://developer.z-api.io";
    case "Evolution API":
      return "https://doc.evolution-api.com";
    case "Meta Business API":
      return "https://developers.facebook.com/docs/whatsapp";
    default:
      return "";
  }
};

// Transform database instance to frontend instance
const transformDbToFrontend = (dbInstance: DbInstance): Instance => {
  const status = mapDbStatusToFrontend(dbInstance.status);
  
  return {
    id: dbInstance.id,
    name: dbInstance.name,
    provider: dbInstance.provider as Instance["provider"],
    function: (dbInstance.instance_function || "dispatcher") as InstanceFunction,
    status,
    health: status === "connected" ? 100 : status === "waitingConnection" ? 50 : 0,
    dispatches: dbInstance.messages_count || 0,
    lastCheck: getRelativeTime(dbInstance.last_message_at || dbInstance.created_at),
    connectedNumber: dbInstance.phone ? `+${dbInstance.phone.replace(/\D/g, "")}` : undefined,
    features: getProviderFeatures(dbInstance.provider),
    documentation: getProviderDocumentation(dbInstance.provider),
    phoneNumber: dbInstance.phone,
    idInstance: dbInstance.external_instance_id || undefined,
    tokenInstance: dbInstance.external_instance_token || undefined,
    paymentStatus: dbInstance.payment_status || undefined,
    expirationDate: dbInstance.expiration_date || undefined,
  };
};

export function useInstances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all instances
  const {
    data: instances = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instances")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching instances:", error);
        throw error;
      }

      return (data || []).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  // Create instance mutation
  const createInstanceMutation = useMutation({
    mutationFn: async (newInstance: {
      name: string;
      provider: string;
      phone: string;
      instance_function?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("instances")
        .insert({
          name: newInstance.name,
          provider: newInstance.provider,
          phone: newInstance.phone,
          status: "disconnected",
          user_id: user.id,
          instance_function: newInstance.instance_function || "dispatcher",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
    onError: (error) => {
      console.error("Error creating instance:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar instância.",
        variant: "destructive",
      });
    },
  });

  // Update instance mutation
  const updateInstanceMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        name: string;
        provider: string;
        phone: string;
        status: string;
        external_instance_id: string;
        external_instance_token: string;
        payment_status: string;
        expiration_date: string;
        instance_function: string;
      }>;
    }) => {
      const { data, error } = await supabase
        .from("instances")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
    onError: (error) => {
      console.error("Error updating instance:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar instância.",
        variant: "destructive",
      });
    },
  });

  // Delete instance mutation
  const deleteInstanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("instances").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
    onError: (error) => {
      console.error("Error deleting instance:", error);
      toast({
        title: "Erro",
        description: "Falha ao deletar instância.",
        variant: "destructive",
      });
    },
  });

  return {
    instances,
    isLoading,
    error,
    refetch,
    createInstance: createInstanceMutation.mutateAsync,
    updateInstance: updateInstanceMutation.mutateAsync,
    deleteInstance: deleteInstanceMutation.mutateAsync,
    isCreating: createInstanceMutation.isPending,
    isUpdating: updateInstanceMutation.isPending,
    isDeleting: deleteInstanceMutation.isPending,
  };
}
