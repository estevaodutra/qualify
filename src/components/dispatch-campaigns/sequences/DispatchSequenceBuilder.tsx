import { DispatchSequence } from "@/hooks/useDispatchSequences";
import { useDispatchSteps } from "@/hooks/useDispatchSteps";
import { UnifiedSequenceBuilder } from "@/components/sequences/UnifiedSequenceBuilder";
import { UnifiedNodeConfigPanel } from "@/components/sequences/UnifiedNodeConfigPanel";
import { LocalNode, NodeCategory } from "@/components/sequences/shared-types";
import { DispatchTriggerConfigCard, DispatchTriggerType, DispatchTriggerConfig } from "./DispatchTriggerConfigCard";
import { MediaUploader } from "@/components/group-campaigns/sequences/MediaUploader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Clock, Image, Video, Music, FileText, MousePointerClick, List as ListIcon, Send, Tag, Award, Sliders, Sparkles, Code, GitBranch, Play } from "lucide-react";

const TRIGGER_NODE_ID = "trigger";

interface DispatchSequenceBuilderProps {
  sequence: DispatchSequence;
  onBack: () => void;
  onUpdate: (args: { id: string; updates: Partial<DispatchSequence> }) => Promise<void>;
}

const NODE_CATEGORIES: NodeCategory[] = [
  { id: "messages", label: "Mensagens", nodes: [
    { type: "message", label: "Texto", icon: MessageSquare, color: "bg-blue-500" },
  ]},
  { id: "media", label: "Mídia", nodes: [
    { type: "image", label: "Imagem", icon: Image, color: "bg-emerald-500" },
    { type: "video", label: "Vídeo", icon: Video, color: "bg-cyan-500" },
    { type: "audio", label: "Áudio", icon: Music, color: "bg-pink-500" },
    { type: "document", label: "Documento", icon: FileText, color: "bg-slate-500" },
  ]},
  { id: "interactive", label: "Interativo", nodes: [
    { type: "buttons", label: "Botões", icon: MousePointerClick, color: "bg-orange-500" },
    { type: "list", label: "Lista", icon: ListIcon, color: "bg-teal-500" },
  ]},
  { id: "flow", label: "Fluxo", nodes: [
    { type: "delay", label: "Delay / Espera", icon: Clock, color: "bg-amber-500" },
    { type: "condition", label: "Condição", icon: GitBranch, color: "bg-purple-500" },
  ]},
  { id: "actions_crm", label: "Ações e CRM", nodes: [
    { type: "tag_add", label: "Adicionar Tag", icon: Tag, color: "bg-orange-600" },
    { type: "tag_remove", label: "Remover Tag", icon: Tag, color: "bg-rose-600" },
    { type: "deal_move", label: "Mover Negócio", icon: Award, color: "bg-emerald-600" },
    { type: "channel_select", label: "Selecionar Canal", icon: Send, color: "bg-indigo-600" },
  ]},
  { id: "advanced", label: "Avançado", nodes: [
    { type: "api_call", label: "Chamada API", icon: Send, color: "bg-sky-600" },
    { type: "field_op", label: "Operação de Campo", icon: Sliders, color: "bg-teal-600" },
    { type: "ai_agent", label: "IA Assistente", icon: Sparkles, color: "bg-violet-600" },
    { type: "js_code", label: "Executar JavaScript", icon: Code, color: "bg-slate-600" },
  ]}
];

const getDefaultConfig = (nodeType: string): Record<string, unknown> => {
  switch (nodeType) {
    case "message": return { content: "" };
    case "image": return { url: "", caption: "" };
    case "video": return { url: "", caption: "" };
    case "audio": return { url: "", caption: "" };
    case "document": return { url: "", filename: "", caption: "" };
    case "buttons": return { text: "", buttons: [{ id: "1", label: "" }] };
    case "list": return { title: "", buttonText: "Selecionar", body: "" };
    case "delay": return { minutes: 5, hours: 0, days: 0 };
    case "webhook_forward": return { url: "", method: "POST", headers: [], includeInstance: true, includeGroups: false, customPayload: "" };
    default: return {};
  }
};

function stepsToNodes(steps: ReturnType<typeof useDispatchSteps>["steps"]): LocalNode[] {
  return steps.map(step => {
    const nodeType = step.stepType === "message" ? (step.messageType || "message") : step.stepType;
    const config: Record<string, unknown> = {};
    if (step.stepType === "delay") {
      const val = step.delayValue || 0;
      const unit = step.delayUnit || "minutes";
      config.days = unit === "days" ? val : 0;
      config.hours = unit === "hours" ? val : 0;
      config.minutes = unit === "minutes" ? val : 0;
    } else if (step.stepType === "message") {
      if (step.messageType === "text" || step.messageType === "message" || !step.messageType) {
        config.content = step.messageContent || "";
      } else if (step.messageType === "buttons") {
        config.text = step.messageContent || "";
        config.buttons = step.messageButtons || [{ id: "1", label: "" }];
      } else if (step.messageType === "list") {
        config.title = ""; config.buttonText = "Selecionar"; config.body = step.messageContent || "";
      } else {
        config.url = step.messageMediaUrl || "";
        config.caption = step.messageContent || "";
        if (step.messageType === "document") config.filename = "";
      }
    }
    return { id: step.id, nodeType: nodeType === "text" ? "message" : nodeType, nodeOrder: step.stepOrder, config };
  });
}

function nodesToSteps(nodes: LocalNode[]) {
  // The canvas-only trigger/start node is a decorative entry-point marker, not
  // a real step — dispatch sequences have no concept of a trigger step, so it
  // must never be converted (it would otherwise become a step with an empty
  // message, since its config only carries decorative UI copy).
  return nodes.filter(node => node.nodeType !== "trigger").map((node, index) => {
    let stepType = "message";
    let messageType: string | null = null;
    let messageContent: string | null = null;
    let messageMediaUrl: string | null = null;
    let messageButtons: unknown[] | null = null;
    let delayValue: number | null = null;
    let delayUnit: string | null = null;

    if (node.nodeType === "delay") {
      stepType = "delay";
      const days = (node.config.days as number) || 0;
      const hours = (node.config.hours as number) || 0;
      const minutes = (node.config.minutes as number) || 0;
      if (days > 0) { delayValue = days; delayUnit = "days"; }
      else if (hours > 0) { delayValue = hours; delayUnit = "hours"; }
      else { delayValue = minutes; delayUnit = "minutes"; }
    } else if (node.nodeType === "message") {
      messageType = "text"; messageContent = (node.config.content as string) || null;
    } else if (node.nodeType === "buttons") {
      messageType = "buttons"; messageContent = (node.config.text as string) || null; messageButtons = (node.config.buttons as unknown[]) || null;
    } else if (node.nodeType === "list") {
      messageType = "list"; messageContent = (node.config.body as string) || null;
    } else {
      messageType = node.nodeType; messageMediaUrl = (node.config.url as string) || null; messageContent = (node.config.caption as string) || null;
    }

    return { stepOrder: index, stepType, messageType, messageContent, messageMediaUrl, messageButtons, delayValue, delayUnit };
  });
}

export function DispatchSequenceBuilder({ sequence, onBack, onUpdate }: DispatchSequenceBuilderProps) {
  const { steps, saveAllSteps, isSaving, isLoading } = useDispatchSteps(sequence.id);

  // The Start node's config is the single editable source of truth for the
  // trigger -- dispatch_sequences.trigger_type/trigger_config are written as a
  // derived mirror on save (see handleSave), never edited independently.
  const triggerNode: LocalNode = {
    id: TRIGGER_NODE_ID,
    nodeType: "trigger",
    nodeOrder: 0,
    positionX: 50,
    positionY: 150,
    config: {
      triggerType: (sequence.triggerType as DispatchTriggerType) || "manual",
      triggerConfig: (sequence.triggerConfig as DispatchTriggerConfig) || {},
    },
  };

  const initialNodes = [triggerNode, ...stepsToNodes(steps)];

  const handleSave = async (name: string, localNodes: LocalNode[]) => {
    const savedTriggerNode = localNodes.find((n) => n.id === TRIGGER_NODE_ID);
    const triggerType = (savedTriggerNode?.config.triggerType as DispatchTriggerType) || "manual";
    const triggerConfig = (savedTriggerNode?.config.triggerConfig as DispatchTriggerConfig) || {};
    await onUpdate({ id: sequence.id, updates: { name, triggerType, triggerConfig: triggerConfig as Record<string, unknown> } });
    await saveAllSteps(nodesToSteps([...localNodes].sort((a, b) => a.nodeOrder - b.nodeOrder)));
  };

  const handleToggleActive = async () => {
    await onUpdate({ id: sequence.id, updates: { isActive: !sequence.isActive } });
  };

  const handleManualSendNode = async (node: LocalNode) => {
    toast.info("Disparo manual de nó individual não disponível para campanhas de disparo (requer contato)");
  };

  return (
    <UnifiedSequenceBuilder
      sequenceName={sequence.name}
      isActive={sequence.isActive}
      sequenceId={sequence.id}
      nodeCategories={NODE_CATEGORIES}
      getDefaultConfig={getDefaultConfig}
      renderConfigPanel={(node, onUpdateConfig, onClose, onManualSend, isSendingManual) => {
        if (node.id === TRIGGER_NODE_ID) {
          const triggerType = (node.config.triggerType as DispatchTriggerType) || "manual";
          const triggerConfig = (node.config.triggerConfig as DispatchTriggerConfig) || {};
          return (
            <div className="flex flex-col h-full">
              <div className="px-6 pt-6 pb-3 shrink-0 border-b border-border">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-sm font-semibold">Gatilho (Início)</h2>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                <DispatchTriggerConfigCard
                  triggerType={triggerType}
                  triggerConfig={triggerConfig}
                  onTriggerTypeChange={(type) => onUpdateConfig({ ...node.config, triggerType: type })}
                  onTriggerConfigChange={(config) => onUpdateConfig({ ...node.config, triggerConfig: config })}
                  sequenceId={sequence.id}
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
            mode="dispatch"
            onManualSend={onManualSend}
            isSendingManual={isSendingManual}
            renderMediaUploader={(props) => (
              <MediaUploader
                mediaType={props.mediaType as "image" | "video" | "audio" | "document" | "sticker"}
                currentUrl={props.currentUrl}
                onUpload={props.onUpload}
                onUrlChange={props.onUrlChange}
                placeholder={props.placeholder}
              />
            )}
          />
        );
      }}
      onSave={handleSave}
      onToggleActive={handleToggleActive}
      onManualSendNode={handleManualSendNode}
      onBack={onBack}
      initialNodes={initialNodes}
      initialConnections={[]}
      isSaving={isSaving}
      isLoading={isLoading}
    />
  );
}
