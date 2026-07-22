export type QuizEventName =
  | "quiz_viewed"
  | "quiz_started"
  | "step_viewed"
  | "step_completed"
  | "component_clicked"
  | "option_selected"
  | "field_focused"
  | "field_changed"
  | "field_completed"
  | "button_clicked"
  | "back_clicked"
  | "lead_identified"
  | "quiz_completed"
  | "quiz_abandoned"
  | "quiz_disqualified"
  | "quiz_error"
  | "quiz_resumed";

export interface QuizEvent {
  id: string;
  companyId: string;
  funnelId: string;
  submissionId: string;
  sessionId: string;
  eventName: QuizEventName;
  stepId: string | null;
  componentId: string | null;
  payload: Record<string, any>;
  createdAt: string;
}

export interface QuizSubmissionDetail {
  id: string;
  publicId: string;
  funnelId: string;
  companyId: string;
  sessionId: string;
  leadId: string | null;
  status: "anonymous" | "started" | "identified" | "completed" | "abandoned" | "disqualified" | "error";
  currentStepId: string | null;
  stepsViewed: number;
  stepsCompleted: number;
  progressPercentage: number;
  firstSeenAt: string;
  startedAt: string | null;
  lastSeenAt: string;
  completedAt: string | null;
  abandonedAt: string | null;
  totalDurationSeconds: number | null;
  entryUrl: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  userAgent: string | null;
  score: number;
  resultData: Record<string, any>;
  leadName?: string | null;
  leadEmail?: string | null;
  leadPhone?: string | null;
}

export interface QuizStepSession {
  id: string;
  companyId: string;
  funnelId: string;
  submissionId: string;
  stepId: string;
  enteredAt: string;
  exitedAt: string | null;
  durationSeconds: number | null;
  exitType: "next" | "back" | "abandon" | "completed" | null;
}
