export type CriafyAccountConnectionStatus = 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED' | 'ERROR';

export type CriafyMediaType = 'IMAGE' | 'VIDEO';

export type CriafyMetaValidationStatus = 'PENDING' | 'VALID' | 'INVALID';

export type CriafyPublicationType = 'FEED' | 'REEL' | 'STORY_IMAGE' | 'STORY_VIDEO';

export type CriafyPublicationStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELED';

export type CriafyAttemptStatus = 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';

export interface CriafyInstagramAccount {
  id: string;
  company_id: string;
  instagram_account_id?: string;
  instagram_user_id?: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  account_type?: string;
  token_expires_at?: string;
  connection_status: CriafyAccountConnectionStatus;
  error_message?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CriafyAccountBriefing {
  id: string;
  company_id: string;
  account_id: string;
  brand_name?: string;
  about?: string;
  objective?: string;
  target_audience?: string;
  brand_positioning?: string;
  tone_of_voice?: string;
  main_topics: string[];
  allowed_topics: string[];
  forbidden_topics: string[];
  preferred_ctas: string[];
  preferred_vocabulary: string[];
  forbidden_vocabulary: string[];
  free_ai_context?: string;
  created_at: string;
  updated_at: string;
}

export interface CriafyContent {
  id: string;
  company_id: string;
  title?: string;
  media_url: string;
  thumbnail_url?: string;
  media_type: CriafyMediaType;
  file_size_bytes?: number;
  mime_type?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  meta_validation_status: CriafyMetaValidationStatus;
  meta_validation_errors: any[];
  ai_analysis: Record<string, any>;
  status: 'ACTIVE' | 'ARCHIVED';
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Account bindings (optional hydrated array)
  linked_account_ids?: string[];
  // Publicações vinculadas e histórico de postagem
  publications?: Array<{
    id: string;
    publication_type: CriafyPublicationType;
    status: CriafyPublicationStatus;
    published_at?: string | null;
    scheduled_at?: string | null;
    ig_permalink?: string | null;
  }>;
  is_published?: boolean;
  is_scheduled?: boolean;
  publish_count?: number;
  last_published_at?: string | null;
}

export interface CriafyQueueRule {
  id: string;
  company_id: string;
  account_id: string;
  posts_per_day: number;
  publication_times: string[];
  start_date: string;
  allowed_days: number[]; // 1=Mon .. 7=Sun
  is_active: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface CriafyPublication {
  id: string;
  company_id: string;
  account_id: string;
  content_id: string;
  publication_type: CriafyPublicationType;
  caption?: string;
  scheduled_at?: string;
  published_at?: string;
  status: CriafyPublicationStatus;
  ig_media_id?: string;
  ig_permalink?: string;
  is_auto_queued: boolean;
  story_sequence_id?: string | null;
  sequence_order?: number | null;
  sequence_total?: number | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Hydrated references
  account?: CriafyInstagramAccount;
  content?: CriafyContent;
}

export interface CriafyPublicationAttempt {
  id: string;
  company_id: string;
  publication_id: string;
  attempt_number: number;
  status: CriafyAttemptStatus;
  error_code?: string;
  error_message?: string;
  raw_response_sanitized: Record<string, any>;
  attempted_at: string;
}

// ==========================================
// REPLICA DO FEED DO INSTAGRAM
// ==========================================
export interface InstagramCommentReply {
  id: string;
  text: string;
  timestamp: string;
  username: string;
  like_count?: number;
}

export interface InstagramComment {
  id: string;
  text: string;
  timestamp: string;
  username: string;
  like_count?: number;
  replies?: {
    data: InstagramCommentReply[];
  };
}

export interface InstagramMediaChild {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
  thumbnail_url?: string;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
  children?: {
    data: InstagramMediaChild[];
  };
  comments?: {
    data: InstagramComment[];
  };
}

export interface InstagramAccountFeedResult {
  profile: {
    id: string;
    username: string;
    name?: string;
    biography?: string;
    profile_picture_url?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    website?: string;
  };
  posts: InstagramPost[];
  paging?: {
    cursors?: {
      after?: string;
      before?: string;
    };
    next?: string;
  };
}

// ==========================================
// INSIGHTS & ANALYTICS DA CONTA
// ==========================================
export interface InstagramInsightsOverview {
  periodDays: number;
  lastSyncedAt: string;
  kpis: {
    views: { value: number; changePct: number };
    netFollowers: { value: number; changePct: number };
    interactions: { value: number; changePct: number };
    profileViews: { value: number; changePct: number };
    websiteClicks: { value: number; changePct: number };
    shares: { value: number; changePct: number };
  };
  viewsPerformance: {
    total: number;
    changePct: number;
    history: Array<{ date: string; label: string; views: number }>;
  };
  viewsByType: {
    reels: number;
    stories: number;
    posts: number;
  };
  interactionsByType: {
    reels: number;
    stories: number;
    posts: number;
  };
  audience: {
    gender: {
      menPct: number;
      womenPct: number;
      menCount: number;
      womenCount: number;
    };
    ageRanges: Array<{
      range: string;
      pct: number;
      count: number;
    }>;
    locations: Array<{
      name: string;
      code: string;
      pct: number;
      count: number;
    }>;
    activityHours: Array<{
      hour: string;
      value: number;
    }>;
    peakActivityText: string;
  };
}

// ==========================================
// CENTRAL DE DEMANDAS (CRIAFY)
// ==========================================
export type CriafyDemandType =
  | "gravar_video"
  | "gravar_audio"
  | "tirar_foto"
  | "revisar_copy"
  | "aprovar_conteudo"
  | "enviar_material"
  | "editar"
  | "publicar"
  | "responder"
  | "coletar_depoimento"
  | "stories_lite"
  | "tarefa_generica";

export type CriafyDemandStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "not_occurred"
  | "cancelled";

export type CriafyDemandPriority = "baixa" | "media" | "alta" | "urgente";

export type CriafyDemandOrigin =
  | "ia"
  | "usuario"
  | "equipe"
  | "gestor"
  | "automacao";

export interface StoriesLitePayload {
  context: "cafe" | "carro" | "trabalho" | "casa" | "final_do_dia" | "bastidor" | string;
  contextLabel: string;
  hook: string;
  bridge: string;
  coreMessage: string;
  connectionToMethod: string;
  cta?: string;
  script?: string;
}

export interface CriafyDemand {
  id: string;
  company_id: string;
  account_id?: string | null;
  planner_item_id?: string | null;
  related_content_id?: string | null;
  title: string;
  description?: string;
  type: CriafyDemandType;
  priority: CriafyDemandPriority;
  status: CriafyDemandStatus;
  origin: CriafyDemandOrigin;
  responsible_id?: string | null;
  responsible_name?: string | null;
  created_by?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  attachments?: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
  stories_lite?: StoriesLitePayload | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// PLANNER EDITORIAL (CRIAFY)
// ==========================================
export type CriafyPlannerFormat =
  | "REEL"
  | "CAROUSEL"
  | "POST"
  | "STORY"
  | "STORIES_LITE"
  | "SCRIPT"
  | "AUDIO"
  | "VIDEO_LONGO";

export type CriafyPlannerStatus =
  | "ideia"
  | "pauta"
  | "roteirizado"
  | "aguardando_gravacao"
  | "em_edicao"
  | "pronto"
  | "agendado"
  | "publicado";

export type CriafyPlannerObjective =
  | "identificacao"
  | "autoridade"
  | "vendas"
  | "conexao"
  | "educacao"
  | "retencao";

export interface CriafyPlannerItem {
  id: string;
  company_id: string;
  account_id?: string | null;
  format: CriafyPlannerFormat;
  theme: string;
  objective?: CriafyPlannerObjective | string;
  pillar?: string;
  angle?: string;
  responsible_id?: string | null;
  responsible_name?: string | null;
  campaign?: string | null;
  priority: CriafyDemandPriority;
  status: CriafyPlannerStatus;
  desired_date?: string | null;
  hook?: string | null;
  script?: string | null;
  caption?: string | null;
  content_id?: string | null;
  publication_id?: string | null;
  demands?: CriafyDemand[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}
