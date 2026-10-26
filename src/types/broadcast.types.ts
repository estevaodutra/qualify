export type BroadcastStatus = 
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export type BroadcastDistributionMode = "immediate" | "daily_limit";

export interface BroadcastAudienceFilters {
  status?: string;
  tags?: string[];
  sourceGroupName?: string;
  sourceType?: string;
  search?: string;
  excludedLeadIds?: string[];
  selectedLeadIds?: string[]; // If user manually checked specific leads
}

export interface BroadcastCampaign {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  description: string | null;
  workflow_id: string | null;
  instance_id: string | null;
  status: BroadcastStatus;
  scheduled_at: string;
  distribution_mode: BroadcastDistributionMode;
  daily_limit: number;
  send_time_start: string;
  send_time_end: string;
  workdays_only: boolean;
  audience_filters: BroadcastAudienceFilters;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  estimated_completion_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  workflow?: {
    id: string;
    name: string;
    description: string | null;
  };
  instance?: {
    id: string;
    name: string;
    phone_number: string | null;
  };
}

export type RecipientStatus = "pending" | "processing" | "sent" | "failed" | "cancelled";

export interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  company_id: string;
  lead_id: string;
  batch_index: number;
  scheduled_date: string;
  status: RecipientStatus;
  dispatched_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    tags: string[] | null;
    status: string | null;
  };
}

export interface CreateBroadcastInput {
  name: string;
  description?: string;
  workflowId: string;
  instanceId?: string;
  distributionMode: BroadcastDistributionMode;
  dailyLimit: number;
  sendTimeStart: string;
  sendTimeEnd: string;
  workdaysOnly: boolean;
  scheduledAt: string; // ISO string or datetime
  filters: BroadcastAudienceFilters;
  selectedLeadIds: string[];
}

export interface BatchPlanItem {
  batchIndex: number;
  date: Date;
  dateFormatted: string;
  count: number;
}

export interface BroadcastScheduleCalculation {
  totalLeads: number;
  dailyLimit: number;
  totalBatches: number;
  totalDays: number;
  startDate: Date;
  estimatedCompletionDate: Date;
  estimatedCompletionFormatted: string;
  batches: BatchPlanItem[];
}
