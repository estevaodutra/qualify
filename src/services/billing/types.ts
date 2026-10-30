export type PlanStatus = "active" | "inactive" | "archived";

export type BillingInterval = "month" | "year" | "one_time";

export type LimitType = "unlimited" | "fixed" | "credit_based" | "disabled";

export type WalletType = "purchased" | "bonus";

export type TransactionType =
  | "topup"
  | "usage"
  | "refund"
  | "manual_adjustment"
  | "bonus"
  | "expiration";

export type ConsumptionPriority = "bonus_first" | "purchased_first";

export type ExpirationType = "none" | "days_after_signup" | "fixed_date";

export type TrialEndAction =
  | "require_payment"
  | "activate_subscription_if_payment_method_exists"
  | "suspend_access"
  | "grace_period";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "suspended"
  | "expired";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: BillingInterval;
  status: PlanStatus;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanLimit {
  id: string;
  plan_id: string;
  resource_key: string;
  resource_name: string;
  limit_type: LimitType;
  limit_value: number | null;
  unit: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreditBonusSettings {
  id: string;
  enabled: boolean;
  default_bonus_amount: number;
  expiration_type: ExpirationType;
  expiration_days?: number;
  expiration_date?: string;
  consumption_priority: ConsumptionPriority;
  apply_on_signup: boolean;
  rules: {
    non_withdrawable: boolean;
    non_transferable: boolean;
    platform_use_only: boolean;
    subscription_payment_allowed: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface TrialSettings {
  id: string;
  enabled: boolean;
  duration_days: number;
  require_payment_method: boolean;
  action_on_end: TrialEndAction;
  grace_period_days: number;
  created_at: string;
  updated_at: string;
}

export interface CreditRate {
  id: string;
  resource_key: string;
  name: string;
  category: "ai" | "telephony" | "transcription" | "media" | "other";
  credits_per_unit: number;
  unit_name: string;
  is_active: boolean;
}

export interface SignupOffer {
  id: string;
  name: string;
  token: string;
  plan_id: string;
  trial_enabled: boolean;
  trial_days: number;
  bonus_credits: number | null; // null uses global bonus
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  campaign?: string;
  status: "active" | "paused" | "expired";
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditWallet {
  id: string;
  company_id: string;
  purchased_balance: number;
  bonus_balance: number;
  total_available: number; // calculated: purchased + bonus
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  company_id: string;
  wallet_type: WalletType;
  type: TransactionType;
  amount: number; // positive for topup/bonus, negative for usage/expiration
  balance_before: number;
  balance_after: number;
  resource?: string;
  reference_id?: string;
  description: string;
  expires_at?: string | null;
  created_by?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  company_name?: string;
  plan_id: string;
  plan_name?: string;
  status: SubscriptionStatus;
  price_snapshot: number;
  currency: string;
  billing_interval: BillingInterval;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  gateway_customer_id?: string;
  gateway_subscription_id?: string;
  payment_method_type?: string;
  payment_method_last4?: string;
  payment_method_brand?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_name: string;
  details: string;
  created_at: string;
}
