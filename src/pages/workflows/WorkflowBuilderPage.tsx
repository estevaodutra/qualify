import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { DispatchSequenceBuilder } from "@/components/dispatch-campaigns/sequences/DispatchSequenceBuilder";
import { SequenceBuilder } from "@/components/group-campaigns/sequences/SequenceBuilder";
import type { DispatchSequence } from "@/hooks/useDispatchSequences";
import type { MessageSequence } from "@/hooks/useSequences";

// Dedicated, fullscreen "Builder Mode" route — deliberately rendered outside
// AppLayout (no sidebar/header/breadcrumb/tabs) so the canvas gets the whole
// viewport, following the same precedent as DispatchSequenceBuilderPage.tsx /
// GroupSequenceBuilderPage.tsx (which in turn cite /call/script/:campaignId/:leadId).
export default function WorkflowBuilderPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: definition, isLoading: loadingDefinition } = useQuery({
    queryKey: ["workflow_definition", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_definitions" as any)
        .select("*")
        .eq("id", workflowId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!workflowId,
  });

  const { data: dispatchSequence, isLoading: loadingDispatch } = useQuery({
    queryKey: ["dispatch_sequence_raw", definition?.source_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_sequences")
        .select("*")
        .eq("id", definition!.source_id)
        .single();
      if (error) throw error;
      return {
        id: data.id,
        campaignId: data.campaign_id,
        name: data.name,
        description: data.description,
        isActive: data.is_active ?? true,
        triggerType: data.trigger_type || "manual",
        triggerConfig: (data.trigger_config as Record<string, unknown>) || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as DispatchSequence;
    },
    enabled: !!definition && definition.source_type === "dispatch_sequence",
  });

  const { data: groupSequence, isLoading: loadingGroup } = useQuery({
    queryKey: ["group_sequence_raw", definition?.source_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_sequences" as any)
        .select("*")
        .eq("id", definition!.source_id)
        .single();
      if (error) throw error;
      const row = data as any;
      return {
        id: row.id,
        groupCampaignId: row.group_campaign_id,
        name: row.name,
        description: row.description,
        triggerType: row.trigger_type || "manual",
        triggerConfig: row.trigger_config || {},
        active: row.active ?? true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as MessageSequence;
    },
    enabled: !!definition && definition.source_type === "group_sequence",
  });

  const handleBack = () => navigate("/workflows");

  // Keeps workflow_definitions' derived mirror (status/trigger_type) in sync
  // whenever the underlying sequence changes -- it's never the source of
  // truth, just a fast index for the library list/filters.
  const syncDefinitionMirror = async (updates: { triggerType?: string; isActiveLike?: boolean; name?: string }) => {
    if (!workflowId) return;
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.triggerType !== undefined) patch.trigger_type = updates.triggerType;
    if (updates.isActiveLike !== undefined) patch.status = updates.isActiveLike ? "active" : "draft";
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workflow_definitions" as any).update(patch).eq("id", workflowId);
    queryClient.invalidateQueries({ queryKey: ["workflow_definitions"] });
  };

  const handleUpdateDispatch = async ({ id, updates }: { id: string; updates: Partial<DispatchSequence> }) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.triggerType !== undefined) dbUpdates.trigger_type = updates.triggerType;
    if (updates.triggerConfig !== undefined) dbUpdates.trigger_config = updates.triggerConfig;

    const { error } = await supabase.from("dispatch_sequences").update(dbUpdates).eq("id", id);
    if (error) throw error;

    await syncDefinitionMirror({ name: updates.name, triggerType: updates.triggerType, isActiveLike: updates.isActive });
    queryClient.invalidateQueries({ queryKey: ["dispatch_sequence_raw", id] });
  };

  const handleUpdateGroup = async ({ id, updates }: { id: string; updates: Partial<MessageSequence> }) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (updates.triggerType !== undefined) dbUpdates.trigger_type = updates.triggerType;
    if (updates.triggerConfig !== undefined) dbUpdates.trigger_config = updates.triggerConfig;

    const { error } = await supabase.from("message_sequences" as any).update(dbUpdates).eq("id", id);
    if (error) throw error;

    await syncDefinitionMirror({ name: updates.name, triggerType: updates.triggerType, isActiveLike: updates.active });
    queryClient.invalidateQueries({ queryKey: ["group_sequence_raw", id] });
  };

  const isLoading = loadingDefinition || loadingDispatch || loadingGroup;

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#F8F9FC] p-3">
      {isLoading || !definition ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : definition.source_type === "dispatch_sequence" && dispatchSequence ? (
        <DispatchSequenceBuilder sequence={dispatchSequence} onBack={handleBack} onUpdate={handleUpdateDispatch} />
      ) : definition.source_type === "group_sequence" && groupSequence ? (
        <SequenceBuilder sequence={groupSequence} onBack={handleBack} onUpdate={handleUpdateGroup} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <p>Este tipo de automação ainda não tem um construtor unificado.</p>
          <button onClick={handleBack} className="text-primary underline text-sm">Voltar para Workflows</button>
        </div>
      )}
    </div>
  );
}
