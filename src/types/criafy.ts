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
