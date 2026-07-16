// src/types/quiz/index.ts

/**
 * Supported Component Types in the Quiz/Funnel module.
 */
export type QuizComponentCategory =
  | "structure"
  | "content"
  | "capture"
  | "question"
  | "conversion"
  | "result";

export type QuizComponentType =
  // Structure
  | "container"
  | "card"
  | "spacer"
  | "divider"
  // Content
  | "heading"
  | "text"
  | "image"
  | "video"
  | "logo"
  // Capture
  | "field_name"
  | "field_email"
  | "field_phone"
  | "field_cpf"
  | "field_cnpj"
  | "field_number"
  | "field_textarea"
  | "field_date"
  | "field_select"
  | "field_checkbox"
  | "field_height"
  | "field_weight"
  | "field_custom"
  // Questions
  | "options"
  | "cards_choice"
  | "rating_stars"
  | "nps"
  | "scale_slider"
  // Conversion
  | "button"
  | "cta_whatsapp"
  // Result
  | "result_score"
  | "result_status"
  | "result_redirect";

/**
 * Breakpoint visibility & style overrides
 */
export interface DeviceConfig {
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  hideOnDesktop?: boolean;
  customWidthMobile?: string;
  customWidthDesktop?: string;
  customMarginMobile?: string;
  customPaddingMobile?: string;
}

/**
 * Condition & Rule Engine Types
 */
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty"
  | "in"
  | "score_greater"
  | "score_less";

export interface ConditionRule {
  id: string;
  fieldId: string;
  operator: ConditionOperator;
  value: string;
}

export type ActionType =
  | "show"
  | "hide"
  | "go_to_step"
  | "add_score"
  | "set_variable"
  | "finish"
  | "redirect";

export interface ConditionAction {
  id: string;
  action: ActionType;
  target?: string;
  value?: unknown;
}

export interface ComponentConditionGroup {
  id: string;
  match: "ALL" | "ANY";
  rules: ConditionRule[];
  actions?: ConditionAction[];
}

/**
 * Base Component Model
 */
export interface QuizComponent<TConfig = Record<string, unknown>> {
  id: string;
  stepId: string;
  funnelId: string;
  componentType: QuizComponentType;
  componentOrder: number;
  config: TConfig;
  schemaVersion: number;
  responsiveConfig?: DeviceConfig;
  conditionsConfig?: ComponentConditionGroup[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Step Model
 */
export type StepType =
  | "intro"
  | "content"
  | "question"
  | "capture"
  | "processing"
  | "result"
  | "approval"
  | "rejection";

export interface StepSettings {
  showLogo?: boolean;
  showProgress?: boolean;
  allowBack?: boolean;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
  countInProgress?: boolean;
  weightInProgress?: number;
  customCssClass?: string;
}

export interface QuizStep {
  id: string;
  funnelId: string;
  companyId?: string;
  name: string;
  slug?: string;
  stepOrder: number;
  type: StepType;
  showLogo: boolean;
  showProgress: boolean;
  allowBack: boolean;
  settings?: StepSettings;
  designConfig?: Record<string, unknown>;
  logicConfig?: {
    branchingRules?: ComponentConditionGroup[];
    defaultNextStepId?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Global Design Tokens & Theme Config
 */
export interface LogoConfig {
  url?: string;
  alt?: string;
  width?: string;
  height?: string;
  maxHeight?: string;
  alignment?: "left" | "center" | "right";
  marginTop?: number;
  marginBottom?: number;
  showLogo?: boolean;
}

export interface ProgressConfig {
  style?: "line" | "segmented" | "points" | "text" | "none";
  color?: string;
  trackColor?: string;
  height?: number;
  position?: "top" | "bottom";
  showLabel?: boolean;
}

export interface QuizDesignConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  backgroundType: "solid" | "gradient" | "image";
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundImageUrl?: string;
  backgroundOverlayOpacity?: number;

  textColor: string;
  headingColor: string;
  mutedTextColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;

  fontFamily: string;
  headingFontFamily?: string;
  baseFontSize: number;
  headingScale: number;
  lineHeight: number;

  pageMaxWidth: number;
  contentMaxWidth: number;
  minHeight: string;
  verticalAlignment: "top" | "center" | "bottom";

  pagePaddingDesktop: number;
  pagePaddingMobile: number;
  componentGap: number;

  borderRadius: string; // e.g. "4px", "12px", "24px"
  inputBorderRadius: string;
  buttonBorderRadius: string;

  inputBackgroundColor: string;
  inputBorderColor: string;
  inputTextColor: string;
  inputPlaceholderColor: string;
  inputFocusColor: string;

  cardEnabled: boolean;
  cardBackgroundColor: string;
  cardBorderColor: string;
  cardShadow: "none" | "sm" | "md" | "lg";
  cardPadding: number;

  logo: LogoConfig;
  progress: ProgressConfig;
}

/**
 * Funnel Settings, SEO & Pixels
 */
export interface SeoConfig {
  title?: string;
  description?: string;
  ogImage?: string;
  faviconUrl?: string;
  canonicalUrl?: string;
}

export interface PixelConfig {
  gaId?: string;
  gtmId?: string;
  fbPixelId?: string;
  tiktokPixelId?: string;
  kwaiPixelId?: string;
}

export interface WebhookConfig {
  url?: string;
  token?: string;
  trigger?: "each_step" | "completion" | "both";
  secret?: string;
}

export interface QuizFunnel {
  id: string;
  companyId?: string;
  userId: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  designConfig: QuizDesignConfig;
  seoConfig: SeoConfig;
  pixelConfig: PixelConfig;
  webhookConfig: WebhookConfig;
  settings?: Record<string, unknown>;
  visitsCount: number;
  responsesCount: number;
  leadsCount: number;
  completionsCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Submission & Answers Model
 */
export interface QuizSubmission {
  id: string;
  funnelId: string;
  sessionId: string;
  leadId?: string;
  status: "started" | "completed";
  stepsCompleted: number;
  score: number;
  resultData?: Record<string, unknown>;
  utmData?: Record<string, string>;
  deviceInfo?: Record<string, string>;
  startedAt: string;
  completedAt?: string;
}

export interface QuizAnswer {
  id: string;
  submissionId: string;
  funnelId: string;
  stepId: string;
  componentId: string;
  answerValue: unknown;
  answeredAt: string;
}
