export interface SprintBoard {
  id: string;
  company_id: string;
  title: string;
  description: string;
  background_value: string;
  is_favorite: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed / aggregated
  lists_count?: number;
  cards_count?: number;
}

export interface SprintLabel {
  id: string;
  board_id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface SprintChecklistItem {
  id: string;
  checklist_id: string;
  card_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  due_date: string | null;
  assigned_user_id: string | null;
  created_at: string;
}

export interface SprintChecklist {
  id: string;
  card_id: string;
  title: string;
  position: number;
  items: SprintChecklistItem[];
  created_at: string;
}

export interface SprintCardMember {
  user_id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface SprintComment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
  user_email?: string;
}

export interface SprintCard {
  id: string;
  list_id: string;
  board_id: string;
  company_id: string;
  title: string;
  description: string;
  position: number;
  due_date: string | null;
  is_completed: boolean;
  cover_color: string | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  labels?: SprintLabel[];
  members?: SprintCardMember[];
  checklists?: SprintChecklist[];
  comments_count?: number;
}

export interface SprintList {
  id: string;
  board_id: string;
  company_id: string;
  title: string;
  position: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  cards: SprintCard[];
}

export interface SprintActivity {
  id: string;
  board_id: string;
  card_id: string | null;
  user_id: string | null;
  action_type: string;
  details: Record<string, any>;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface MentionSuggestion {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}
