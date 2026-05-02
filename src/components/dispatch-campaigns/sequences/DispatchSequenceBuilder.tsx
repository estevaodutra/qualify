import { useState, useEffect } from "react";
import { DispatchSequence } from "@/hooks/useDispatchSequences";
import { useDispatchSteps } from "@/hooks/useDispatchSteps";
import { UnifiedSequenceBuilder } from "@/components/sequences/UnifiedSequenceBuilder";
import { UnifiedNodeConfigPanel } from "@/components/sequences/UnifiedNodeConfigPanel";
import { LocalNode, NodeCategory } from "@/components/sequences/shared-types";
import { DispatchTriggerConfigCard, DispatchTriggerType, DispatchTriggerConfig } from "./DispatchTriggerConfigCard";
import { MediaUploader } from "@/components/group-campaigns/sequences/MediaUploader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Clock, Image, Video, Music, FileText, MousePointerClick, List as ListIcon, Send } from "lucide-react";

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
    { type: "delay", label: "Delay", icon: Clock, color: "bg-amber-500" },
    { type: "webhook_forward", label: "Enviar p/ Webhook", icon: Send, color: "bg-fuchsia-500" },
  ]},
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
  return nodes.map((node, index) => {
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
  const { steps, saveAllSteps, isSaving } = useDispatchSteps(sequence.id);
  const [triggerType, setTriggerType] = useState<DispatchTriggerType>((sequence.triggerType as DispatchTriggerType) || "manual");
  const [triggerConfig, setTriggerConfig] = useState<DispatchTriggerConfig>((sequence.triggerConfig as DispatchTriggerConfig) || {});

  useEffect(() => {
    setTriggerType((sequence.triggerType as DispatchTriggerType) || "manual");
    setTriggerConfig((sequence.triggerConfig as DispatchTriggerConfig) || {});
  }, [sequence.id, sequence.triggerType, sequence.triggerConfig]);

  const initialNodes = stepsToNodes(steps);

  const handleSave = async (name: string, localNodes: LocalNode[]) => {
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
      renderTrigger={() => (
        <DispatchTriggerConfigCard
          triggerType={triggerType}
          triggerConfig={triggerConfig}
          onTriggerTypeChange={setTriggerType}
          onTriggerConfigChange={setTriggerConfig}
          sequenceId={sequence.id}
        />
      )}
      renderConfigPanel={(node, onUpdateConfig, onClose, onManualSend, isSendingManual) => (
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
      )}
      onSave={handleSave}
      onToggleActive={handleToggleActive}
      onManualSendNode={handleManualSendNode}
      onBack={onBack}
      initialNodes={initialNodes}
      initialConnections={[]}
      isSaving={isSaving}
    />
  );
}
