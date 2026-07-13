export interface PipelineGroup {
  id: string;
  company_id: string;
  name: string;
  color: string | null;
  order_index: number;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  company_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  status: 'active' | 'archived';
  order_index: number;
  created_at: string;
  updated_at: string;
  
  stages?: PipelineStage[];
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  company_id: string;
  name: string;
  color: string;
  order_index: number;
  stage_type: 'open' | 'won' | 'lost';
  created_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  company_id: string;
  name: string | null;
  phone: string | null;
  lid: string | null;
  email: string | null;
  company_name: string | null;
  website: string | null;
  document: string | null;
  birth_date: string | null;
  owner_id: string | null;
  tags: string[];
  custom_fields: Record<string, string | number | boolean | null>;
  active_campaign_id: string | null;
  active_campaign_type: string | null;
  source_type: string | null;
  source_name: string | null;
  source_campaign_id: string | null;
  source_group_id: string | null;
  source_group_name: string | null;
  total_calls: number;
  total_messages: number;
  last_contact_at: string | null;
  last_interaction_at: string | null;
  next_activity_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Computed aggregations
  active_deals_count?: number;
  total_open_value?: number;
  total_won_value?: number;
  won_deals_count?: number;
  avg_ticket?: number;
  pending_activities_count?: number;
}

export interface Deal {
  id: string;
  company_id: string;
  lead_id: string;
  pipeline_id: string | null;
  stage_id: string | null;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  status: 'open' | 'won' | 'lost' | 'archived';
  owner_id: string | null;
  priority: 'low' | 'medium' | 'high';
  probability: number;
  expected_close_date: string | null;
  last_activity_at: string | null;
  next_activity_at: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relations
  lead?: Lead;
}

export interface Activity {
  id: string;
  company_id: string;
  lead_id: string;
  deal_id: string | null;
  type: 'task' | 'call' | 'meeting' | 'message' | 'follow_up' | 'note';
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  company_id: string;
  lead_id: string;
  deal_id: string | null;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LeadHistoryEvent {
  id: string;
  company_id: string;
  lead_id: string;
  deal_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  source: string | null;
  actor_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}
