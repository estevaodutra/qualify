import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { webhookCategories, WebhookCategory } from "@/data/webhook-categories";

export interface WebhookConfig {
  id: string;
  user_id: string;
  category: string;
  name: string;
  url: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// Função utilitária EXPORTADA para obter a URL do webhook de uma categoria
// Pode ser usada fora do hook com configs passados como parâmetro
export const getWebhookUrlForCategory = (
  categoryId: string,
  configs: WebhookConfig[] | undefined
): string => {
  // 1. Busca configuração do usuário
  const userConfig = configs?.find(c => c.category === categoryId);
  
  // 2. Se existe, está ativa e tem URL, usa a URL do usuário
  if (userConfig?.url && userConfig.is_active) {
    return userConfig.url;
  }
  
  // 3. Fallback: URL padrão da categoria
  const category = webhookCategories.find((c: WebhookCategory) => c.id === categoryId);
  return category?.defaultUrl || "";
};

export function useWebhookConfigs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ["webhook-configs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("webhook_configs")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as WebhookConfig[];
    },
    enabled: !!user?.id,
  });

  const upsertConfig = useMutation({
    mutationFn: async (config: Partial<WebhookConfig> & { category: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const category = webhookCategories.find(c => c.id === config.category);
      if (!category) throw new Error("Invalid category");

      const { data, error } = await supabase
        .from("webhook_configs")
        .upsert({
          user_id: user.id,
          category: config.category,
          name: category.name,
          url: config.url || "",
          description: category.description,
          is_active: config.is_active ?? true,
        }, {
          onConflict: "user_id,category",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast({
        title: "Webhook salvo",
        description: "Configuração atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
      console.error("Error saving webhook config:", error);
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (category: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("webhook_configs")
        .delete()
        .eq("user_id", user.id)
        .eq("category", category);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast({
        title: "Webhook removido",
        description: "Configuração resetada para padrão.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível remover a configuração.",
        variant: "destructive",
      });
      console.error("Error deleting webhook config:", error);
    },
  });

  const testWebhook = async (url: string): Promise<boolean> => {
    try {
      const payload = {
        action: "test.connection",
        test: {
          message: "Test connection from dispatchOne",
          timestamp: new Date().toISOString(),
        },
      };
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "no-cors",
      });
      
      toast({
        title: "Teste enviado",
        description: "Requisição de teste enviada para o webhook.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Não foi possível conectar ao webhook.",
        variant: "destructive",
      });
      return false;
    }
  };

  const getConfigForCategory = (categoryId: string): WebhookConfig | undefined => {
    return configs?.find(c => c.category === categoryId);
  };

  const getDynamicUrl = (categoryId: string): string => {
    const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
    return `${baseUrl}/webhooks/${categoryId}`;
  };

  return {
    configs,
    isLoading,
    upsertConfig,
    deleteConfig,
    testWebhook,
    getConfigForCategory,
    getDynamicUrl,
  };
}
