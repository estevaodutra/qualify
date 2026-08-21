export type QuickReplyContentType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'video_note'
  | 'document'
  | 'link';

export interface TextContentPayload {
  text: string;
}

export interface ImageContentPayload {
  mediaUrl: string;
  storagePath?: string;
  caption?: string;
}

export interface VideoContentPayload {
  mediaUrl: string;
  storagePath?: string;
  caption?: string;
}

export interface AudioContentPayload {
  mediaUrl: string;
  storagePath?: string;
  asVoice?: boolean;
}

export interface VideoNoteContentPayload {
  mediaUrl: string;
  storagePath?: string;
}

export interface DocumentContentPayload {
  mediaUrl: string;
  storagePath?: string;
  fileName: string;
  mimeType?: string;
  caption?: string;
}

export interface LinkContentPayload {
  url: string;
  text?: string;
}

export type QuickReplyContentPayload = {
  contentType: QuickReplyContentType;
  content:
    | TextContentPayload
    | ImageContentPayload
    | VideoContentPayload
    | AudioContentPayload
    | VideoNoteContentPayload
    | DocumentContentPayload
    | LinkContentPayload;
};

export interface QuickReplyGroup {
  id: string;
  company_id: string;
  name: string;
  color: string | null;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickReply {
  id: string;
  company_id: string;
  group_id: string | null;
  name: string;
  shortcut: string;
  normalized_shortcut: string;
  content_type: QuickReplyContentType;
  content_json: QuickReplyContentPayload;
  position: number;
  active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export const QUICK_REPLY_GROUP_COLORS = [
  { name: "Verde", value: "#10B981" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Roxo", value: "#8B5CF6" },
  { name: "Amarelo", value: "#F59E0B" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Cinza", value: "#6B7280" },
];
