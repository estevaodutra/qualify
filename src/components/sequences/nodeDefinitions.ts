import type { LucideIcon } from "lucide-react";
import {
  MessageSquare, Clock, GitBranch, Shuffle, Tag, Award, Send, Link2, Sliders, Sparkles,
  Image, Video, Music, FileText, Smile, BarChart3, MousePointerClick, List, MapPin, Contact, Calendar,
  Plus, Pencil, UserPlus, UserMinus, ShieldAlert, ShieldCheck, Settings, Radio, UsersRound
} from "lucide-react";
import type { NodeCategory, NodeTypeInfo } from "./shared-types";

export type NodeStatus = "available" | "coming_soon";

export interface NodeSubTypeDefinition {
  subType: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface NodeBlockDefinition {
  blockType: string;
  label: string;
  icon: LucideIcon;
  color: string;
  status?: NodeStatus;
  subTypes?: NodeSubTypeDefinition[];
}

// The 8 main blocks the palette now shows for group-campaign sequences,
// replacing the previous 22 flat node-type entries. "content" and "action"
// carry sub-types selected inside the node's own config panel (see
// UnifiedNodeConfigPanel's "content"/"action" blocks) rather than being
// separate palette entries — this is what keeps the palette short enough to
// fit without scrolling.
export const NODE_DEFINITIONS: NodeBlockDefinition[] = [
  {
    blockType: "content", label: "Mensagem", icon: MessageSquare, color: "bg-blue-500",
    subTypes: [
      { subType: "message", label: "Mensagem de texto", icon: MessageSquare, color: "bg-blue-500" },
      { subType: "image", label: "Imagem", icon: Image, color: "bg-emerald-500" },
      { subType: "video", label: "Vídeo", icon: Video, color: "bg-cyan-500" },
      { subType: "audio", label: "Mensagem de áudio", icon: Music, color: "bg-pink-500" },
      { subType: "document", label: "Arquivo anexo", icon: FileText, color: "bg-slate-500" },
      { subType: "user_input", label: "Entrada do usuário", icon: MessageSquare, color: "bg-indigo-500" },
      { subType: "delay", label: "Atraso de tempo", icon: Clock, color: "bg-amber-500" },
      { subType: "dynamic_url", label: "Arquivo URL Dinâmica", icon: Link2, color: "bg-sky-500" },
      { subType: "sticker", label: "Figurinha", icon: Smile, color: "bg-yellow-500" },
      { subType: "poll", label: "Enquete", icon: BarChart3, color: "bg-indigo-500" },
      { subType: "buttons", label: "Botões", icon: MousePointerClick, color: "bg-orange-500" },
      { subType: "list", label: "Lista", icon: List, color: "bg-teal-500" },
      { subType: "location", label: "Localização", icon: MapPin, color: "bg-red-500" },
      { subType: "contact", label: "Contato", icon: Contact, color: "bg-violet-500" },
      { subType: "event", label: "Evento", icon: Calendar, color: "bg-sky-500" },
    ],
  },
  { blockType: "delay", label: "Delay / Espera", icon: Clock, color: "bg-amber-500" },
  { blockType: "condition", label: "Condição", icon: GitBranch, color: "bg-purple-500" },
  { blockType: "randomizer", label: "Randomizador", icon: Shuffle, color: "bg-fuchsia-500" },
  {
    blockType: "action", label: "Ação", icon: Tag, color: "bg-orange-600",
    subTypes: [
      { subType: "tag_add", label: "Adicionar Tag", icon: Tag, color: "bg-orange-600" },
      { subType: "tag_remove", label: "Remover Tag", icon: Tag, color: "bg-rose-600" },
      { subType: "deal_move", label: "Mover Negócio", icon: Award, color: "bg-emerald-600" },
      { subType: "channel_select", label: "Selecionar Canal", icon: Send, color: "bg-indigo-600" },
    ],
  },
  { blockType: "group_management", label: "Gestão de Grupo", icon: UsersRound, color: "bg-indigo-600" },
  { blockType: "status", label: "Status", icon: Radio, color: "bg-pink-600" },
  { blockType: "api_call", label: "API", icon: Link2, color: "bg-sky-600", status: "coming_soon" },
  { blockType: "field_op", label: "Mapeamento de Campos", icon: Sliders, color: "bg-teal-600" },
  { blockType: "ai_agent", label: "AI Assistant", icon: Sparkles, color: "bg-violet-600", status: "coming_soon" },
];

export function getNodeBlockDefinition(blockType: string): NodeBlockDefinition | undefined {
  return NODE_DEFINITIONS.find((b) => b.blockType === blockType);
}

export function getNodeSubTypeInfo(blockType: string, subType: string | undefined): NodeSubTypeDefinition | undefined {
  const block = getNodeBlockDefinition(blockType);
  if (!block?.subTypes) return undefined;
  return block.subTypes.find((s) => s.subType === subType);
}

// Maps every legacy literal node_type (message/image/.../tag_add/.../field_op)
// back to the block+subtype it now lives under, driving the lift-on-load side
// of the legacy adapter (see legacyNodeAdapter.ts).
export function isContentSubType(nodeType: string): boolean {
  const block = getNodeBlockDefinition("content");
  if (!block || !block.subTypes) return false;
  return block.subTypes.some((s) => s.subType === nodeType);
}

export function isActionSubType(nodeType: string): boolean {
  const block = getNodeBlockDefinition("action");
  if (!block || !block.subTypes) return false;
  return block.subTypes.some((s) => s.subType === nodeType);
}

// Icon/label/color lookup for the canvas card + palette, resolving through a
// sub-type when the node is a lifted "content"/"action" node.
export function getNodeVisual(nodeType: string, contentType?: string, actionType?: string): { label: string; icon: LucideIcon; color: string } | undefined {
  const groupNodes: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    group_create: { label: "Criar Grupo", icon: Plus, color: "bg-indigo-600" },
    group_rename: { label: "Renomear Grupo", icon: Pencil, color: "bg-indigo-600" },
    group_photo: { label: "Alterar Foto", icon: Image, color: "bg-indigo-600" },
    group_description: { label: "Alterar Descrição", icon: FileText, color: "bg-indigo-600" },
    group_add_participant: { label: "Adicionar Membro", icon: UserPlus, color: "bg-indigo-600" },
    group_remove_participant: { label: "Remover Membro", icon: UserMinus, color: "bg-indigo-600" },
    group_promote_admin: { label: "Promover Admin", icon: ShieldAlert, color: "bg-indigo-600" },
    group_remove_admin: { label: "Remover Admin", icon: ShieldCheck, color: "bg-indigo-600" },
    group_settings: { label: "Configurações", icon: Settings, color: "bg-indigo-600" },
  };
  if (groupNodes[nodeType]) return groupNodes[nodeType];

  if (nodeType === "content") {
    const sub = getNodeSubTypeInfo("content", contentType);
    if (sub) return sub;
    const block = getNodeBlockDefinition("content")!;
    return { label: block.label, icon: block.icon, color: block.color };
  }
  if (nodeType === "action") {
    const sub = getNodeSubTypeInfo("action", actionType);
    if (sub) return sub;
    const block = getNodeBlockDefinition("action")!;
    return { label: block.label, icon: block.icon, color: block.color };
  }
  const block = getNodeBlockDefinition(nodeType);
  if (block) return { label: block.label, icon: block.icon, color: block.color };
  return undefined;
}

export function getDefaultConfigForSubType(blockType: string, subType: string): Record<string, unknown> {
  switch (subType) {
    case "message": return { content: "", sendPrivate: false, mentionMember: false, viewOnce: false };
    case "image": return { url: "", caption: "", sendPrivate: false, viewOnce: false };
    case "video": return { url: "", caption: "", sendPrivate: false, isVideoNote: false, viewOnce: false };
    case "audio": return { url: "", isVoiceMessage: true, sendPrivate: false, viewOnce: false };
    case "document": return { url: "", filename: "", caption: "", sendPrivate: false, viewOnce: false };
    case "sticker": return { url: "", sendPrivate: false, viewOnce: false };
    case "user_input": return { targetField: "", timeoutMs: 3600000, question: "", invalidMessage: "", saveMedia: false };
    case "delay": return { delayMs: 300000, value: 5, unit: "minutes" };
    case "dynamic_url": return { url: "", caption: "", sendPrivate: false, viewOnce: false };
    case "poll": return { question: "", options: ["", "", ""], multiSelect: false };
    case "buttons": return { text: "", buttons: [{ id: "1", label: "", type: "REPLY" }] };
    case "list": return { title: "", buttonText: "Selecionar", sections: [{ title: "Opções", rows: [{ id: "1", title: "", description: "" }] }] };
    case "location": return { latitude: "", longitude: "", name: "", address: "" };
    case "contact": return { fullName: "", phone: "", email: "", organization: "" };
    case "event": return { name: "", description: "", startDate: "", endDate: "", location: "" };
    case "tag_add": case "tag_remove": return { tag: "" };
    case "deal_move": return { stageId: "" };
    case "channel_select": return { instanceId: "", fallbackType: "last_sender" };
    case "group_create": return { groupName: "", phones: [""], description: "", photoUrl: "" };
    case "group_rename": return { newName: "" };
    case "group_photo": return { url: "" };
    case "group_description": return { description: "" };
    case "group_add_participant": return { phones: [""] };
    case "group_remove_participant": return { phone: "" };
    case "group_promote_admin": return { phone: "" };
    case "group_remove_admin": return { phone: "" };
    case "group_settings": return { adminOnlyMessage: false, adminOnlyEditInfo: false, approvalMode: false, locked: false };
    default: return {};
  }
}

export function getDefaultConfigForBlock(blockType: string): Record<string, unknown> {
  switch (blockType) {
    case "content": return { contentType: "message", ...getDefaultConfigForSubType("content", "message") };
    case "action": return { actionType: "tag_add", ...getDefaultConfigForSubType("action", "tag_add") };
    case "delay": return { delayMs: 300000, value: 5, unit: "minutes" };
    case "condition": return { field: "member_count", operator: "greater_than", value: 0 };
    case "group_management": return {
      targetMode: "workflow_groups",
      selectedGroupJids: [],
      continueOnActionError: false,
      actions: []
    };
    case "randomizer": return {
      mode: "weighted_random",
      branches: [
        { id: crypto.randomUUID(), label: "A", weight: 50, position: 0 },
        { id: crypto.randomUUID(), label: "B", weight: 50, position: 1 },
      ],
    };
    case "field_op": return { field: "", operation: "set", value: "" };
    case "status": return {
      statusType: "text",
      content: "",
      url: "",
      caption: "",
      instanceId: "",
      scheduleType: "now",
      scheduling: {
        type: "single",
        recount: "daily",
        days: [],
        times: ["12:00"]
      }
    };
    case "api_call": case "ai_agent": return {};
    default: return {};
  }
}

// Expands NODE_DEFINITIONS into the flat NodeCategory[]/NodeTypeInfo[] shape
// UnifiedSequenceBuilder/NodePalettePopover already consume — "content" and
// "action" are represented as ONE palette tile each (their sub-type is chosen
// inside the config panel after the node is created), so the top-level list
// stays at 8 rows regardless of how many content/action sub-types exist.
export function toNodeCategories(isGroup?: boolean): NodeCategory[] {
  const core: NodeTypeInfo[] = NODE_DEFINITIONS
    .filter((b) => ["content", "delay", "condition", "randomizer", "action"].includes(b.blockType))
    .map((b) => ({ type: b.blockType, label: b.label, icon: b.icon, color: b.color, status: b.status }));

  const channels: NodeTypeInfo[] = NODE_DEFINITIONS
    .filter((b) => ["status"].includes(b.blockType))
    .map((b) => ({ type: b.blockType, label: b.label, icon: b.icon, color: b.color, status: b.status }));

  const advanced: NodeTypeInfo[] = NODE_DEFINITIONS
    .filter((b) => ["api_call", "field_op", "ai_agent"].includes(b.blockType))
    .map((b) => ({ type: b.blockType, label: b.label, icon: b.icon, color: b.color, status: b.status }));

  const categories: NodeCategory[] = [
    { id: "core", label: "Blocos principais", nodes: core },
    { id: "channels", label: "Canais", nodes: channels },
    { id: "advanced", label: "Avançado", nodes: advanced },
  ];

  if (isGroup) {
    categories.push({
      id: "group_management",
      label: "Gestão de Grupo",
      nodes: [
        { type: "group_management", label: "Gestão de Grupo", icon: UsersRound, color: "bg-indigo-600" }
      ]
    });
  }

  return categories;
}
