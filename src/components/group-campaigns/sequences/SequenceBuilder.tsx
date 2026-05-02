import { useState, useEffect } from "react";
import { MessageSequence, useSequenceNodes } from "@/hooks/useSequences";
import { UnifiedSequenceBuilder } from "@/components/sequences/UnifiedSequenceBuilder";
import { UnifiedNodeConfigPanel } from "@/components/sequences/UnifiedNodeConfigPanel";
import { LocalNode, NodeCategory } from "@/components/sequences/shared-types";
import { TriggerType, TriggerConfig } from "./TriggerConfigCard";
import { MediaUploader } from "./MediaUploader";
import { PollActionDialog, PollActionConfig, getActionIconColor, getActionLabel } from "./PollActionDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Clock, GitBranch, Bell, Link2, Send,
  Image, Video, Music, FileText, Smile,
  BarChart3, MousePointerClick, List, MapPin, Contact, Calendar,
  Pencil, ImageIcon, UserPlus, UserMinus, ShieldPlus, ShieldMinus, Settings, Plus, CircleDot,
} from "lucide-react";

interface SequenceBuilderProps {
  sequence: MessageSequence;
  onBack: () => void;
  onUpdate: (args: { id: string; updates: Partial<MessageSequence> }) => Promise<void>;
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
    { type: "sticker", label: "Figurinha", icon: Smile, color: "bg-yellow-500" },
  ]},
  { id: "interactive", label: "Interativo", nodes: [
    { type: "poll", label: "Enquete", icon: BarChart3, color: "bg-indigo-500" },
    { type: "buttons", label: "Botões", icon: MousePointerClick, color: "bg-orange-500" },
    { type: "list", label: "Lista", icon: List, color: "bg-teal-500" },
    { type: "location", label: "Localização", icon: MapPin, color: "bg-red-500" },
    { type: "contact", label: "Contato", icon: Contact, color: "bg-violet-500" },
    { type: "event", label: "Evento", icon: Calendar, color: "bg-sky-500" },
  ]},
  { id: "flow", label: "Fluxo", nodes: [
    { type: "delay", label: "Delay", icon: Clock, color: "bg-amber-500" },
    { type: "condition", label: "Condição", icon: GitBranch, color: "bg-purple-500" },
    { type: "notify", label: "Notificar", icon: Bell, color: "bg-green-500" },
    { type: "webhook", label: "Webhook", icon: Link2, color: "bg-rose-500" },
    { type: "webhook_forward", label: "Enviar p/ Webhook", icon: Send, color: "bg-fuchsia-500" },
  ]},
  { id: "status", label: "Status", nodes: [
    { type: "status_image", label: "Status Imagem", icon: CircleDot, color: "bg-emerald-500" },
    { type: "status_video", label: "Status Vídeo", icon: CircleDot, color: "bg-cyan-500" },
  ]},
  { id: "group_management", label: "Gestão de Grupo", nodes: [
    { type: "group_create", label: "Criar Grupo", icon: Plus, color: "bg-teal-600" },
    { type: "group_rename", label: "Renomear Grupo", icon: Pencil, color: "bg-sky-600" },
    { type: "group_photo", label: "Alterar Foto", icon: ImageIcon, color: "bg-emerald-600" },
    { type: "group_description", label: "Alterar Descrição", icon: FileText, color: "bg-slate-600" },
    { type: "group_add_participant", label: "Adicionar Participante", icon: UserPlus, color: "bg-green-600" },
    { type: "group_remove_participant", label: "Remover Participante", icon: UserMinus, color: "bg-red-600" },
    { type: "group_promote_admin", label: "Promover Admin", icon: ShieldPlus, color: "bg-violet-600" },
    { type: "group_remove_admin", label: "Remover Admin", icon: ShieldMinus, color: "bg-orange-600" },
    { type: "group_settings", label: "Configurações", icon: Settings, color: "bg-zinc-600" },
  ]},
];

const getDefaultConfig = (nodeType: string): Record<string, unknown> => {
  switch (nodeType) {
    case "message": return { content: "", sendPrivate: false, mentionMember: false, viewOnce: false };
    case "image": return { url: "", caption: "", sendPrivate: false, viewOnce: false };
    case "video": return { url: "", caption: "", sendPrivate: false, isVideoNote: false, viewOnce: false };
    case "audio": return { url: "", isVoiceMessage: true, sendPrivate: false, viewOnce: false };
    case "document": return { url: "", filename: "", caption: "", sendPrivate: false, viewOnce: false };
    case "sticker": return { url: "", sendPrivate: false, viewOnce: false };
    case "poll": return { question: "", options: ["", "", ""], multiSelect: false };
    case "buttons": return { text: "", buttons: [{ id: "1", label: "", type: "REPLY" }] };
    case "list": return { title: "", buttonText: "Selecionar", sections: [{ title: "Opções", rows: [{ id: "1", title: "", description: "" }] }] };
    case "location": return { latitude: "", longitude: "", name: "", address: "" };
    case "contact": return { fullName: "", phone: "", email: "", organization: "" };
    case "event": return { name: "", description: "", startDate: "", endDate: "", location: "" };
    case "delay": return { seconds: 0, minutes: 5, hours: 0, days: 0 };
    case "condition": return { field: "member_count", operator: "greater_than", value: 0 };
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
  const { nodes, connections, saveNodes, saveConnections, isSaving } = useSequenceNodes(sequence.id);
  const [triggerType, setTriggerType] = useState<TriggerType>(sequence.triggerType as TriggerType || "manual");
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>((sequence.triggerConfig as TriggerConfig) || {});

  useEffect(() => {
    setTriggerType(sequence.triggerType as TriggerType || "manual");
    setTriggerConfig((sequence.triggerConfig as TriggerConfig) || {});
  }, [sequence.id, sequence.triggerType, sequence.triggerConfig]);

  const initialNodes: LocalNode[] = nodes.map(n => ({
    id: n.id, nodeType: n.nodeType, nodeOrder: n.nodeOrder, config: n.config,
  }));

  const initialConnections = connections.map(c => ({
    sourceNodeId: c.sourceNodeId, targetNodeId: c.targetNodeId, conditionPath: c.conditionPath || undefined,
  }));

  const handleSave = async (name: string, localNodes: LocalNode[], localConnections: { sourceNodeId: string; targetNodeId: string; conditionPath?: string }[]) => {
    await onUpdate({ id: sequence.id, updates: { name, triggerType, triggerConfig: triggerConfig as Record<string, unknown> } });
    const idMapping = await saveNodes(localNodes.map(node => ({
      localId: node.id, nodeType: node.nodeType, positionX: 0, positionY: node.nodeOrder * 100, nodeOrder: node.nodeOrder, config: node.config,
    })));
    await saveConnections({ connectionsToSave: localConnections, idMapping });
  };

  const handleToggleActive = async () => {
    await onUpdate({ id: sequence.id, updates: { active: !sequence.active } });
  };

  const handleManualSendNode = async (node: LocalNode) => {
    try {
      const { data: campaign } = await supabase
        .from("group_campaigns")
        .select("id")
        .eq("id", sequence.groupCampaignId)
        .single();

      if (!campaign) {
        toast.error("Campanha não encontrada");
        return;
      }

      const { error } = await supabase.functions.invoke("execute-message", {
        body: {
          campaignId: sequence.groupCampaignId,
          sequenceId: sequence.id,
          manualNodeIndex: node.nodeOrder,
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
      nodeCategories={NODE_CATEGORIES}
      getDefaultConfig={getDefaultConfig}
      renderTrigger={() => null}
      renderConfigPanel={(node, onUpdateConfig, onClose, onManualSend, isSendingManual) => (
        <UnifiedNodeConfigPanel
          node={node}
          onUpdate={onUpdateConfig}
          onClose={onClose}
          open={true}
          mode="group"
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
      )}
      onSave={handleSave}
      onToggleActive={handleToggleActive}
      onManualSendNode={handleManualSendNode}
      onBack={onBack}
      initialNodes={initialNodes}
      initialConnections={initialConnections}
      isSaving={isSaving}
    />
  );
}
