import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface ProspectingCampaign {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  searchTerms: string;
  quantity: number;
  category?: string;
  exactNames: boolean;
  places?: string;
  postActionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DbProspectingCampaign {
  id: string;
  company_id: string | null;
  user_id: string;
  name: string;
  status: string;
  search_terms: string;
  quantity: number;
  category: string | null;
  exact_names: boolean;
  places: string | null;
  post_action_id: string | null;
  created_at: string;
  updated_at: string;
}

const transformDbToFrontend = (db: DbProspectingCampaign): ProspectingCampaign => ({
  id: db.id,
  name: db.name,
  status: (db.status as ProspectingCampaign["status"]) || "running",
  searchTerms: db.search_terms,
  quantity: db.quantity,
  category: db.category || undefined,
  exactNames: db.exact_names,
  places: db.places || undefined,
  postActionId: db.post_action_id || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export function useProspectingCampaigns() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["prospecting_campaigns", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("prospecting_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      } else {
        query = query.eq("user_id", user?.id).is("company_id", null);
      }

      const { data, error } = await query;

      if (error) {
        // If the table doesn't exist yet, we just return empty array
        // to not break the frontend while the user hasn't run the migration
        if (error.code === '42P01') {
           return [];
        }
        throw error;
      }
      return (data as DbProspectingCampaign[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (campaign: { 
      name: string; 
      searchTerms: string;
      quantity: number;
      category?: string;
      exactNames?: boolean;
      places?: string;
      postActionId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const dbCampaign = {
        user_id: user.id,
        company_id: activeCompanyId,
        name: campaign.name,
        search_terms: campaign.searchTerms,
        quantity: campaign.quantity,
        category: campaign.category || null,
        exact_names: campaign.exactNames || false,
        places: campaign.places || null,
        post_action_id: campaign.postActionId || null,
        status: "running",
      };

      const { data, error } = await supabase
        .from("prospecting_campaigns")
        .insert(dbCampaign)
        .select()
        .single();

      if (error) throw error;
      
      const created = transformDbToFrontend(data as DbProspectingCampaign);

      // Trigger Webhook in background
      fetch("https://n8n.6ksfuf.easypanel.host/webhook/prospecition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          campaign_id: created.id,
          company_id: activeCompanyId,
          user_id: user.id,
          search_terms: created.searchTerms,
          quantity: created.quantity,
          category: created.category,
          exact_names: created.exactNames,
          places: created.places,
          post_action_id: created.postActionId
        })
      }).then(async (response) => {
        if (response.ok) {
          const results = await response.json();
          if (Array.isArray(results) && results.length > 0) {
             const leadsToInsert = results.map((lead: any) => ({
               user_id: user.id,
               name: lead.name || lead.title || "Sem nome",
               phone: lead.phone || lead.phoneUnformatted || null,
               custom_fields: lead,
               active_campaign_id: created.id,
               active_campaign_type: "whatsapp",
               source_name: "Google Maps",
               source_type: "prospecting"
             })).filter(l => l.phone); // Apenas insere quem tem telefone

             if (leadsToInsert.length > 0) {
               await supabase.from("leads").insert(leadsToInsert);
             }
          }

          // Atualiza status para concluído
          await supabase.from("prospecting_campaigns").update({ status: "completed" }).eq("id", created.id);
          queryClient.invalidateQueries({ queryKey: ["prospecting_campaigns"] });
          toast({ title: "Prospecção Concluída!", description: "Sua busca terminou e retornou contatos prontos para uso." });
        } else {
          throw new Error("Resposta da webhook com erro.");
        }
      }).catch(async (e) => {
        console.error("Erro ao notificar webhook:", e);
        await supabase.from("prospecting_campaigns").update({ status: "error" }).eq("id", created.id);
        queryClient.invalidateQueries({ queryKey: ["prospecting_campaigns"] });
        toast({ title: "Erro na Prospecção", description: "A prospecção falhou ou não retornou resultados no tempo esperado.", variant: "destructive" });
      });

      return { created, count: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospecting_campaigns"] });
      toast({ title: "Campanha iniciada", description: "Está sendo executado em segundo plano." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospecting_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospecting_campaigns"] });
      toast({ title: "Campanha removida" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign: createMutation.mutateAsync,
    deleteCampaign: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
