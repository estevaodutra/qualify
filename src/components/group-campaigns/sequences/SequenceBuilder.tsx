import { MessageSequence, useSequenceNodes } from "@/hooks/useSequences";
import { UnifiedSequenceBuilder } from "@/components/sequences/UnifiedSequenceBuilder";
import { UnifiedNodeConfigPanel } from "@/components/sequences/UnifiedNodeConfigPanel";
import { LocalNode } from "@/components/sequences/shared-types";
import { toNodeCategories, getDefaultConfigForBlock } from "@/components/sequences/nodeDefinitions";
import { liftLegacyNode, lowerToLegacyNode } from "@/components/sequences/legacyNodeAdapter";
import { GroupTriggerConfigCard } from "./GroupTriggerConfigCard";
import type { TriggerType, TriggerConfig } from "./triggerTypes";
import { MediaUploader } from "./MediaUploader";
import { PollActionDialog, PollActionConfig, getActionIconColor, getActionLabel } from "./PollActionDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";

const TRIGGER_NODE_TYPE = "trigger";

interface SequenceBuilderProps {
  sequence: MessageSequence;
  onBack: () => void;
  onUpdate: (args: { id: string; updates: Partial<MessageSequence> }) => Promise<void>;
}

const NODE_CATEGORIES = toNodeCategories();

const getDefaultConfig = (nodeType: string): Record<string, unknown> => {
  switch (nodeType) {
    case "content": case "delay": case "condition": case "randomizer":
    case "action": case "field_op": case "api_call": case "ai_agent":
    case "group_management":
      return getDefaultConfigForBlock(nodeType);
    case "notify": return { message: "", notifyAdmins: true };
    case "webhook": return { url: "", method: "POST", body: "" };
    case "webhook_forward": return { url: "", method: "POST", headers: [], includeInstance: true, includeGroups: true, customPayload: "" };
    case "group_create": return { groupName: "", phones: [""] };
    case "group_rename": return { newName: "" };
    case "group_photo": return { url: "" };
    case "group_description": return { description: "" };
    case "group_add_participant": return { phones: [""] };
    case "group_remove_participant": return { phone: "" };
    case "group_promote_admin": return { phone: "" };
    case "group_remove_admin": return { phone: "" };
    case "group_settings": return { adminOnlyMessage: false, adminOnlyEditInfo: false, approvalMode: false, locked: false };
    case "status_image": return { url: "", caption: "" };
    case "status_video": return { url: "", caption: "" };
    default: return {};
  }
};

export function SequenceBuilder({ sequence, onBack, onUpdate }: SequenceBuilderProps) {
  const { nodes, connections, saveNodes, saveConnections, isSaving, isLoading } = useSequenceNodes(sequence.id);

  const persistedTrigger = nodes.find(n => n.nodeType === TRIGGER_NODE_TYPE);

  const initialNodes: LocalNode[] = nodes.map(n => liftLegacyNode({
    ...n,
    id: n.id,
    nodeType: n.nodeType as any,
    positionX: n.positionX,
    positionY: n.positionY,
    nodeOrder: n.nodeOrder,
    config: (n.config as any) || {},
  }));

  if (!persistedTrigger) {
    initialNodes.unshift({
      id: "trigger",
      nodeType: TRIGGER_NODE_TYPE,
      nodeOrder: 0,
      positionX: 50,
      positionY: 150,
      config: {
        triggers: [{
          id: Math.random().toString(36).substring(2, 9),
          type: (sequence.triggerType as TriggerType) || "manual",
          config: {}
        }]
      },
    });
  }

  const initialConnections = connections.map(c => ({
    sourceNodeId: c.sourceNodeId, targetNodeId: c.targetNodeId, conditionPath: c.conditionPath || undefined,
  }));

  const handleSave = async (
    name: string, 
    localNodes: LocalNode[], 
    localConnections: { sourceNodeId: string; targetNodeId: string; conditionPath?: string }[],
    workflowConfig: Record<string, unknown>
  ) => {
    const triggerNode = localNodes.find(n => n.nodeType === TRIGGER_NODE_TYPE);
    const triggerType = (triggerNode?.config.triggerType as TriggerType) || "manual";
    await onUpdate({ 
      id: sequence.id, 
      updates: { 
        name, 
        triggerType, 
        triggerConfig: workflowConfig 
      } 
    });
    const idMapping = await saveNodes(localNodes.map(lowerToLegacyNode).map(node => ({
      localId: node.id, nodeType: node.nodeType, positionX: node.positionX || 0, positionY: node.positionY || 0, nodeOrder: node.nodeOrder, config: node.config,
    })));
    await saveConnections({ connectionsToSave: localConnections, idMapping });
  };

  const handleToggleActive = async () => {
    await onUpdate({ id: sequence.id, updates: { active: !sequence.active } });
  };

  const handleManualSendNode = async (node: LocalNode) => {
    try {
      let activeCampaignId = sequence.id;

      // No longer need to query group_campaigns, we just use sequence.id
      const campaign = { id: activeCampaignId };


      const { error } = await supabase.functions.invoke("execute-message", {
        body: {
          campaignId: activeCampaignId,
          sequenceId: sequence.id,
          manualNodeIndex: node.nodeOrder,
          manualNodeOverride: {
            type: node.nodeType,
            config: node.config,
          }
        },
      });

      if (error) throw error;
      toast.success("Mensagem disparada com sucesso!");
    } catch (err) {
      console.error("Manual send error:", err);
      toast.error("Erro ao disparar mensagem");
    }
  };

  const getOptionAction = (node: LocalNode, index: number): PollActionConfig | null => {
    const optionActions = (node.config.optionActions as Record<string, PollActionConfig>) || {};
    return optionActions[String(index)] || null;
  };

  return (
    <UnifiedSequenceBuilder
      sequenceName={sequence.name}
      isActive={sequence.active}
      sequenceId={sequence.id}
      campaignId={sequence.id}
      nodeCategories={NODE_CATEGORIES}
      getDefaultConfig={getDefaultConfig}
      renderConfigPanel={(node, onUpdateConfig, onClose, onManualSend, isSendingManual, isGroup, nodes) => {
        if (node.nodeType === TRIGGER_NODE_TYPE) {
          const triggerType = (node.config.triggerType as TriggerType) || "manual";
          const triggerConfig = (node.config.triggerConfig as TriggerConfig) || {};
          return (
            <div className="flex flex-col h-full">
              <div className="px-6 pt-6 pb-3 shrink-0 border-b border-border">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-sm font-semibold">Gatilho (Início)</h2>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                <GroupTriggerConfigCard
                  triggerType={triggerType}
                  triggerConfig={triggerConfig}
                  onTriggerTypeChange={(type) => onUpdateConfig({ ...node.config, triggerType: type })}
                  onTriggerConfigChange={(config) => onUpdateConfig({ ...node.config, triggerConfig: config })}
                  sequenceId={sequence.id}
                  campaignId={sequence.id}
                />
              </div>
            </div>
          );
        }
        return (
          <UnifiedNodeConfigPanel
            node={node}
            onUpdate={onUpdateConfig}
            onClose={onClose}
            open={true}
            mode="group"
            isGroup={isGroup}
            onManualSend={onManualSend}
            isSendingManual={isSendingManual}
            nodes={nodes}
            renderMediaUploader={(props) => (
              <MediaUploader
                mediaType={props.mediaType as "image" | "video" | "audio" | "document" | "sticker"}
                currentUrl={props.currentUrl}
                onUpload={props.onUpload}
                onUrlChange={props.onUrlChange}
                placeholder={props.placeholder}
              />
            )}
            renderPollActionDialog={(props) => (
              <PollActionDialog
                open={props.open}
                onClose={props.onClose}
                optionIndex={props.optionIndex}
                optionText={props.optionText}
                currentAction={props.currentAction as PollActionConfig | null}
                onSave={props.onSave as (action: PollActionConfig) => void}
              />
            )}
            getOptionAction={getOptionAction}
            getActionIconColor={getActionIconColor}
            getActionLabel={getActionLabel}
          />
        );
      }}
      onSave={handleSave}
      onToggleActive={handleToggleActive}
      onManualSendNode={handleManualSendNode}
      onBack={onBack}
      initialNodes={initialNodes}
      initialConnections={initialConnections}
      isSaving={isSaving}
      isLoading={isLoading}
      workflowConfig={(sequence.triggerConfig as Record<string, unknown>) || {}}
    />
  );
}
