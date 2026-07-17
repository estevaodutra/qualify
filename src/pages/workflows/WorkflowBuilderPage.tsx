import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { SequenceBuilder } from "@/components/group-campaigns/sequences/SequenceBuilder";
import type { MessageSequence } from "@/hooks/useSequences";

// Dedicated, fullscreen "Builder Mode" route — deliberately rendered outside
// AppLayout (no sidebar/header/breadcrumb/tabs) so the canvas gets the whole
// viewport, following the same precedent as DispatchSequenceBuilderPage.tsx /
// GroupSequenceBuilderPage.tsx.
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

  const { data: groupSequence, isLoading: loadingGroup } = useQuery({
    queryKey: ["group_sequence_raw", definition?.source_id],
    queryFn: async () => {
      // First, try to fetch from message_sequences
      const { data, error } = await supabase
        .from("message_sequences" as any)
        .select("*")
        .eq("id", definition!.source_id)
        .maybeSingle();

      if (data) {
        const row = data as any;
        let finalCampaignId = row.group_campaign_id;
        
        // If the workflow is orphaned (no campaign), create one so group linking works
        if (!finalCampaignId) {
          const { data: newCampaign } = await supabase
            .from("group_campaigns")
            .insert({
              name: row.name || "Workflow Context",
              status: "active",
              user_id: row.user_id,
              company_id: row.company_id
            })
            .select("id")
            .single();
            
          if (newCampaign) {
            finalCampaignId = newCampaign.id;
            await supabase
              .from("message_sequences" as any)
              .update({ group_campaign_id: finalCampaignId })
              .eq("id", row.id);
          }
        }

        return {
          id: row.id,
          groupCampaignId: finalCampaignId,
          name: row.name,
          description: row.description,
          triggerType: row.trigger_type || "manual",
          triggerConfig: row.trigger_config || {},
          active: row.active ?? true,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } as MessageSequence;
      }

      // If it doesn't exist in message_sequences, this is a legacy dispatch_sequence workflow.
      // We automatically migrate it to a unified sequence in the database on-the-fly.
      const { data: ds, error: dsErr } = await supabase
        .from("dispatch_sequences")
        .select("*")
        .eq("id", definition!.source_id)
        .single();
      if (dsErr) throw dsErr;

      // 1. Create a matching group_campaign if needed
      await supabase
        .from("group_campaigns")
        .insert({
          id: ds.campaign_id,
          user_id: ds.user_id,
          company_id: ds.company_id,
          name: ds.name,
          status: "active"
        });

      // 2. Create the message_sequence
      const { data: ms, error: msErr } = await supabase
        .from("message_sequences" as any)
        .insert({
          id: ds.id,
          user_id: ds.user_id,
          company_id: ds.company_id,
          group_campaign_id: ds.campaign_id,
          name: ds.name,
          description: ds.description,
          trigger_type: ds.trigger_type,
          trigger_config: { ...((ds.trigger_config as any) || {}), isGroup: false }, // default to DM mode
          active: ds.is_active,
        })
        .select()
        .single();
      if (msErr) throw msErr;

      // 3. Fetch legacy steps to migrate them into sequence_nodes
      const { data: steps } = await supabase
        .from("dispatch_sequence_steps")
        .select("*")
        .eq("sequence_id", ds.id)
        .order("step_order", { ascending: true });

      // Generate trigger (start) node
      const triggerNodeId = crypto.randomUUID();
      await supabase.from("sequence_nodes" as any).insert({
        id: triggerNodeId,
        sequence_id: ds.id,
        user_id: ds.user_id,
        node_type: "trigger",
        position_x: 50,
        position_y: 150,
        node_order: 0,
        config: { triggerType: ds.trigger_type, triggerConfig: ds.trigger_config }
      });

      if (steps && steps.length > 0) {
        let prevNodeId = triggerNodeId;
        for (const step of steps) {
          const nodeId = step.id; // reuse step UUID as node ID
          await supabase.from("sequence_nodes" as any).insert({
            id: nodeId,
            sequence_id: ds.id,
            user_id: ds.user_id,
            node_type: step.step_type === "message" ? "content" : step.step_type,
            position_x: 320 + step.step_order * 260,
            position_y: 150,
            node_order: step.step_order + 1,
            config: step.step_type === "message" ? {
              contentType: step.message_type || "message",
              content: ["text", "buttons", "list"].includes(step.message_type) || !step.message_type ? step.message_content : null,
              caption: !["text", "buttons", "list"].includes(step.message_type) && step.message_type ? step.message_content : null,
              url: step.message_media_url,
              buttons: step.message_buttons
            } : {
              minutes: step.delay_unit === "minutes" ? step.delay_value : 0,
              hours: step.delay_unit === "hours" ? step.delay_value : 0,
              days: step.delay_unit === "days" ? step.delay_value : 0
            }
          });

          // Connect sequential steps
          await supabase.from("sequence_connections" as any).insert({
            sequence_id: ds.id,
            user_id: ds.user_id,
            source_node_id: prevNodeId,
            target_node_id: nodeId
          });
          prevNodeId = nodeId;
        }
      }

      // 4. Update the workflow definition to group_sequence
      await supabase
        .from("workflow_definitions" as any)
        .update({ source_type: "group_sequence" })
        .eq("id", definition!.id);

      const row = ms as any;
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
    enabled: !!definition,
  });

  const handleBack = () => navigate("/workflows");

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

  const isLoading = loadingDefinition || loadingGroup;

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#F8F9FC] p-3">
      {isLoading || !definition ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : groupSequence ? (
        <SequenceBuilder sequence={groupSequence} onBack={handleBack} onUpdate={handleUpdateGroup} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <p>Não foi possível carregar a automação especificada.</p>
          <button onClick={handleBack} className="text-primary underline text-sm">Voltar para Workflows</button>
        </div>
      )}
    </div>
  );
}
