import {
  Plan,
  PlanLimit,
  CreditBonusSettings,
  TrialSettings,
  CreditRate,
  SignupOffer,
  CreditWallet,
  CreditTransaction,
  Subscription,
  AuditLogEntry,
} from "./types";

const STORAGE_KEYS = {
  PLAN: "qualify_billing_plan_v1",
  LIMITS: "qualify_billing_limits_v1",
  BONUS: "qualify_billing_bonus_v1",
  TRIAL: "qualify_billing_trial_v1",
  RATES: "qualify_billing_rates_v1",
  OFFERS: "qualify_billing_offers_v1",
  WALLETS: "qualify_billing_wallets_v1",
  TRANSACTIONS: "qualify_billing_transactions_v1",
  SUBSCRIPTIONS: "qualify_billing_subscriptions_v1",
  AUDIT: "qualify_billing_audit_v1",
};

// Initial Single Plan Qualify (R$ 197 / mês)
const INITIAL_PLAN: Plan = {
  id: "plan_qualify_standard",
  name: "Qualify",
  slug: "qualify",
  description: "Plano único com acesso total à plataforma, disparos ilimitados e créditos sob demanda para recursos avançados.",
  price: 197.0,
  currency: "BRL",
  billing_interval: "month",
  status: "active",
  is_default: true,
  created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

// Initial Plan Limits (Disparos, conversas, contatos, pipelines, funis, workflows, conteúdos ilimitados)
const INITIAL_LIMITS: PlanLimit[] = [
  {
    id: "lim_messages",
    plan_id: "plan_qualify_standard",
    resource_key: "messages",
    resource_name: "Disparos de Mensagens",
    limit_type: "unlimited",
    limit_value: null,
    unit: "mensagens",
    description: "Sem limite artificial de mensagens enviadas na plataforma",
    is_active: true,
  },
  {
    id: "lim_conversations",
    plan_id: "plan_qualify_standard",
    resource_key: "conversations",
    resource_name: "Conversas Ativas",
    limit_type: "unlimited",
    limit_value: null,
    unit: "conversas",
    description: "Sem limitação no volume de conversas simultâneas",
    is_active: true,
  },
  {
    id: "lim_contacts",
    plan_id: "plan_qualify_standard",
    resource_key: "contacts",
    resource_name: "Contatos & Leads",
    limit_type: "unlimited",
    limit_value: null,
    unit: "contatos",
    description: "Base de dados e contatos ilimitados",
    is_active: true,
  },
  {
    id: "lim_pipelines",
    plan_id: "plan_qualify_standard",
    resource_key: "pipelines",
    resource_name: "Pipelines de Vendas",
    limit_type: "unlimited",
    limit_value: null,
    unit: "pipelines",
    description: "Criação ilimitada de funis e esteiras comerciais",
    is_active: true,
  },
  {
    id: "lim_workflows",
    plan_id: "plan_qualify_standard",
    resource_key: "workflows",
    resource_name: "Workflows & Automações",
    limit_type: "unlimited",
    limit_value: null,
    unit: "workflows",
    description: "Fluxos de trabalho e automações sem limite",
    is_active: true,
  },
  {
    id: "lim_content",
    plan_id: "plan_qualify_standard",
    resource_key: "content",
    resource_name: "Conteúdos & Criativos",
    limit_type: "unlimited",
    limit_value: null,
    unit: "conteúdos",
    description: "Organização e publicação de posts sem limite",
    is_active: true,
  },
  {
    id: "lim_whatsapp",
    plan_id: "plan_qualify_standard",
    resource_key: "whatsapp_connections",
    resource_name: "Conexões WhatsApp",
    limit_type: "fixed",
    limit_value: 2,
    unit: "instâncias",
    description: "Máximo de números WhatsApp conectados simultaneamente",
    is_active: true,
  },
  {
    id: "lim_ai",
    plan_id: "plan_qualify_standard",
    resource_key: "ai",
    resource_name: "Motor de IA (Skills & Modelos)",
    limit_type: "credit_based",
    limit_value: null,
    unit: "créditos",
    description: "Consome saldo de créditos da carteira da empresa",
    is_active: true,
  },
  {
    id: "lim_external",
    plan_id: "plan_qualify_standard",
    resource_key: "external_usage",
    resource_name: "Serviços Externos (Telefonia & Mídia)",
    limit_type: "credit_based",
    limit_value: null,
    unit: "créditos",
    description: "Consumo tarifado por minuto/requisição via carteira",
    is_active: true,
  },
];

// Initial Bonus Settings
const INITIAL_BONUS: CreditBonusSettings = {
  id: "bonus_global_cfg",
  enabled: true,
  default_bonus_amount: 5.0,
  expiration_type: "none",
  expiration_days: undefined,
  consumption_priority: "bonus_first",
  apply_on_signup: true,
  rules: {
    non_withdrawable: true,
    non_transferable: true,
    platform_use_only: true,
    subscription_payment_allowed: false,
  },
  created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

// Initial Trial Settings
const INITIAL_TRIAL: TrialSettings = {
  id: "trial_global_cfg",
  enabled: true,
  duration_days: 7,
  require_payment_method: false,
  action_on_end: "require_payment",
  grace_period_days: 3,
  created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

// Initial Credit Rates
const INITIAL_RATES: CreditRate[] = [
  {
    id: "rate_ai_text",
    resource_key: "ai_text_generation",
    name: "Geração de Conteúdo IA (Texto)",
    category: "ai",
    credits_per_unit: 0.1,
    unit_name: "por requisição",
    is_active: true,
  },
  {
    id: "rate_ai_script",
    resource_key: "ai_script_writer",
    name: "Roteiro Completo de Vídeo / Reels",
    category: "ai",
    credits_per_unit: 0.25,
    unit_name: "por roteiro",
    is_active: true,
  },
  {
    id: "rate_transcription",
    resource_key: "audio_transcription",
    name: "Transcrição de Áudio (Whisper)",
    category: "transcription",
    credits_per_unit: 0.15,
    unit_name: "por minuto de áudio",
    is_active: true,
  },
  {
    id: "rate_telephony",
    resource_key: "voice_call_minute",
    name: "Ligação Telefônica / Voz",
    category: "telephony",
    credits_per_unit: 0.35,
    unit_name: "por minuto conectado",
    is_active: true,
  },
  {
    id: "rate_image_gen",
    resource_key: "creative_image_generation",
    name: "Geração de Criativo / Imagem IA",
    category: "media",
    credits_per_unit: 0.5,
    unit_name: "por imagem gerada",
    is_active: true,
  },
];

// Initial Signup Offers
const INITIAL_OFFERS: SignupOffer[] = [
  {
    id: "offer_default_trial",
    name: "Trial 7 dias — Onboarding Geral",
    token: "qualify-trial-7d",
    plan_id: "plan_qualify_standard",
    trial_enabled: true,
    trial_days: 7,
    bonus_credits: 5.0,
    max_redemptions: null,
    redemption_count: 14,
    expires_at: null,
    campaign: "organico",
    status: "active",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "offer_special_promo",
    name: "Campanha VIP — R$ 20 em Bônus de IA",
    token: "qualify-vip-20bonus",
    plan_id: "plan_qualify_standard",
    trial_enabled: true,
    trial_days: 7,
    bonus_credits: 20.0,
    max_redemptions: 100,
    redemption_count: 38,
    expires_at: new Date(Date.now() + 45 * 86400000).toISOString(),
    campaign: "influencers-launch",
    status: "active",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Mock company seeds for initial UI demonstration
const INITIAL_WALLETS: CreditWallet[] = [
  {
    id: "w_demo_1",
    company_id: "c1",
    purchased_balance: 150.0,
    bonus_balance: 5.0,
    total_available: 155.0,
    updated_at: new Date().toISOString(),
  },
  {
    id: "w_demo_2",
    company_id: "c2",
    purchased_balance: 0.0,
    bonus_balance: 5.0,
    total_available: 5.0,
    updated_at: new Date().toISOString(),
  },
  {
    id: "w_demo_3",
    company_id: "c3",
    purchased_balance: 85.5,
    bonus_balance: 20.0,
    total_available: 105.5,
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub_1",
    company_id: "c1",
    company_name: "Qualify Matriz & Operação",
    plan_id: "plan_qualify_standard",
    plan_name: "Qualify",
    status: "active",
    price_snapshot: 197.0,
    currency: "BRL",
    billing_interval: "month",
    current_period_start: new Date(Date.now() - 15 * 86400000).toISOString(),
    current_period_end: new Date(Date.now() + 15 * 86400000).toISOString(),
    cancel_at_period_end: false,
    payment_method_type: "credit_card",
    payment_method_last4: "4242",
    payment_method_brand: "Mastercard",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sub_2",
    company_id: "c2",
    company_name: "Percurso da Vida Treinamentos",
    plan_id: "plan_qualify_standard",
    plan_name: "Qualify",
    status: "trialing",
    price_snapshot: 197.0,
    currency: "BRL",
    billing_interval: "month",
    trial_started_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    trial_ends_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    cancel_at_period_end: false,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sub_3",
    company_id: "c3",
    company_name: "Clínica Nova Saúde",
    plan_id: "plan_qualify_standard",
    plan_name: "Qualify",
    status: "active",
    price_snapshot: 197.0,
    currency: "BRL",
    billing_interval: "month",
    current_period_start: new Date(Date.now() - 10 * 86400000).toISOString(),
    current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
    cancel_at_period_end: false,
    payment_method_type: "credit_card",
    payment_method_last4: "8899",
    payment_method_brand: "Visa",
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_TRANSACTIONS: CreditTransaction[] = [
  {
    id: "ctx_1",
    company_id: "c1",
    wallet_type: "purchased",
    type: "topup",
    amount: 150.0,
    balance_before: 0.0,
    balance_after: 150.0,
    description: "Recarga de Créditos via Cartão",
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: "ctx_2",
    company_id: "c2",
    wallet_type: "bonus",
    type: "bonus",
    amount: 5.0,
    balance_before: 0.0,
    balance_after: 5.0,
    description: "Bônus de Boas-Vindas no Cadastro",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "ctx_3",
    company_id: "c3",
    wallet_type: "bonus",
    type: "bonus",
    amount: 20.0,
    balance_before: 0.0,
    balance_after: 20.0,
    description: "Bônus Campanha VIP",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const INITIAL_AUDIT: AuditLogEntry[] = [
  {
    id: "aud_1",
    action: "PLAN_INITIALIZED",
    entity_type: "plan",
    entity_id: "plan_qualify_standard",
    actor_name: "Super Admin",
    details: "Plano único Qualify R$ 197/mês configurado como padrão.",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "aud_2",
    action: "TRIAL_CONFIGURED",
    entity_type: "trial",
    entity_id: "trial_global_cfg",
    actor_name: "Super Admin",
    details: "Trial de 7 dias com carência de 3 dias ativado.",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

// In-memory fallback map for environments without window/localStorage (e.g. Vitest/SSR)
const memoryStorage = new Map<string, any>();

// Helper for local storage read/write
function readStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === "undefined" || !localStorage) {
      return memoryStorage.has(key) ? memoryStorage.get(key) : fallback;
    }
    const raw = localStorage.getItem(key);
    if (!raw) return memoryStorage.has(key) ? memoryStorage.get(key) : fallback;
    return JSON.parse(raw);
  } catch {
    return memoryStorage.has(key) ? memoryStorage.get(key) : fallback;
  }
}

function writeStorage<T>(key: string, data: T): void {
  memoryStorage.set(key, data);
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {
    // Local storage warning silently handled
  }
}

export const billingStore = {
  // Plan
  getPlan(): Plan {
    return readStorage<Plan>(STORAGE_KEYS.PLAN, INITIAL_PLAN);
  },
  savePlan(plan: Plan, actorName = "Super Admin"): Plan {
    const updated = { ...plan, updated_at: new Date().toISOString() };
    writeStorage(STORAGE_KEYS.PLAN, updated);
    this.addAudit({
      action: "PLAN_UPDATED",
      entity_type: "plan",
      entity_id: plan.id,
      actor_name: actorName,
      details: `Plano alterado para R$ ${plan.price}/${plan.billing_interval} (${plan.status})`,
    });
    return updated;
  },

  // Limits
  getLimits(): PlanLimit[] {
    return readStorage<PlanLimit[]>(STORAGE_KEYS.LIMITS, INITIAL_LIMITS);
  },
  saveLimits(limits: PlanLimit[], actorName = "Super Admin"): PlanLimit[] {
    writeStorage(STORAGE_KEYS.LIMITS, limits);
    this.addAudit({
      action: "LIMITS_UPDATED",
      entity_type: "limits",
      entity_id: "plan_limits",
      actor_name: actorName,
      details: `Matriz de limites atualizada (${limits.length} recursos).`,
    });
    return limits;
  },

  // Bonus settings
  getBonusSettings(): CreditBonusSettings {
    return readStorage<CreditBonusSettings>(STORAGE_KEYS.BONUS, INITIAL_BONUS);
  },
  saveBonusSettings(settings: CreditBonusSettings, actorName = "Super Admin"): CreditBonusSettings {
    const updated = { ...settings, updated_at: new Date().toISOString() };
    writeStorage(STORAGE_KEYS.BONUS, updated);
    this.addAudit({
      action: "BONUS_SETTINGS_UPDATED",
      entity_type: "bonus_settings",
      entity_id: settings.id,
      actor_name: actorName,
      details: `Bônus de boas-vindas: R$ ${settings.default_bonus_amount} (Ordem: ${settings.consumption_priority})`,
    });
    return updated;
  },

  // Trial settings
  getTrialSettings(): TrialSettings {
    return readStorage<TrialSettings>(STORAGE_KEYS.TRIAL, INITIAL_TRIAL);
  },
  saveTrialSettings(settings: TrialSettings, actorName = "Super Admin"): TrialSettings {
    const updated = { ...settings, updated_at: new Date().toISOString() };
    writeStorage(STORAGE_KEYS.TRIAL, updated);
    this.addAudit({
      action: "TRIAL_SETTINGS_UPDATED",
      entity_type: "trial_settings",
      entity_id: settings.id,
      actor_name: actorName,
      details: `Trial atualizado para ${settings.duration_days} dias (Ação fim: ${settings.action_on_end})`,
    });
    return updated;
  },

  // Credit Rates
  getRates(): CreditRate[] {
    return readStorage<CreditRate[]>(STORAGE_KEYS.RATES, INITIAL_RATES);
  },
  saveRates(rates: CreditRate[], actorName = "Super Admin"): CreditRate[] {
    writeStorage(STORAGE_KEYS.RATES, rates);
    this.addAudit({
      action: "RATES_UPDATED",
      entity_type: "credit_rates",
      entity_id: "rates",
      actor_name: actorName,
      details: `Taxas de consumo atualizadas (${rates.length} recursos).`,
    });
    return rates;
  },

  // Signup Offers
  getOffers(): SignupOffer[] {
    return readStorage<SignupOffer[]>(STORAGE_KEYS.OFFERS, INITIAL_OFFERS);
  },
  saveOffer(offer: SignupOffer, actorName = "Super Admin"): SignupOffer {
    const offers = this.getOffers();
    const idx = offers.findIndex((o) => o.id === offer.id);
    let updatedList: SignupOffer[];
    if (idx >= 0) {
      updatedList = [...offers];
      updatedList[idx] = { ...offer, updated_at: new Date().toISOString() };
    } else {
      updatedList = [offer, ...offers];
    }
    writeStorage(STORAGE_KEYS.OFFERS, updatedList);
    this.addAudit({
      action: idx >= 0 ? "OFFER_UPDATED" : "OFFER_CREATED",
      entity_type: "signup_offer",
      entity_id: offer.id,
      actor_name: actorName,
      details: `Link de cadastro '${offer.name}' (${offer.token}) ${idx >= 0 ? "atualizado" : "criado"}.`,
    });
    return offer;
  },

  // Wallets
  getWallets(): CreditWallet[] {
    return readStorage<CreditWallet[]>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
  },
  getWalletByCompany(companyId: string): CreditWallet {
    const wallets = this.getWallets();
    const found = wallets.find((w) => w.company_id === companyId);
    if (found) return found;

    const newWallet: CreditWallet = {
      id: "w_" + Math.random().toString(36).substring(2, 9),
      company_id: companyId,
      purchased_balance: 0,
      bonus_balance: 0,
      total_available: 0,
      updated_at: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.WALLETS, [newWallet, ...wallets]);
    return newWallet;
  },
  updateWallet(wallet: CreditWallet): void {
    const wallets = this.getWallets();
    const idx = wallets.findIndex((w) => w.id === wallet.id || w.company_id === wallet.company_id);
    const calculated: CreditWallet = {
      ...wallet,
      total_available: Number((wallet.purchased_balance + wallet.bonus_balance).toFixed(2)),
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) {
      wallets[idx] = calculated;
    } else {
      wallets.push(calculated);
    }
    writeStorage(STORAGE_KEYS.WALLETS, wallets);
  },

  // Transactions
  getTransactions(companyId?: string): CreditTransaction[] {
    const txs = readStorage<CreditTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    if (!companyId) return txs;
    return txs.filter((t) => t.company_id === companyId);
  },
  addTransaction(tx: Omit<CreditTransaction, "id" | "created_at">): CreditTransaction {
    const fullTx: CreditTransaction = {
      ...tx,
      id: "ctx_" + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };
    const txs = this.getTransactions();
    writeStorage(STORAGE_KEYS.TRANSACTIONS, [fullTx, ...txs]);
    return fullTx;
  },

  // Subscriptions
  getSubscriptions(): Subscription[] {
    return readStorage<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);
  },
  getSubscriptionByCompany(companyId: string): Subscription | undefined {
    return this.getSubscriptions().find((s) => s.company_id === companyId);
  },
  saveSubscription(sub: Subscription, actorName = "Super Admin"): Subscription {
    const subs = this.getSubscriptions();
    const idx = subs.findIndex((s) => s.id === sub.id || s.company_id === sub.company_id);
    const updated = { ...sub, updated_at: new Date().toISOString() };
    if (idx >= 0) {
      subs[idx] = updated;
    } else {
      subs.push(updated);
    }
    writeStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);
    this.addAudit({
      action: "SUBSCRIPTION_UPDATED",
      entity_type: "subscription",
      entity_id: sub.id,
      actor_name: actorName,
      details: `Assinatura de '${sub.company_name || sub.company_id}' alterada para ${sub.status}.`,
    });
    return updated;
  },

  // Audit
  getAudit(): AuditLogEntry[] {
    return readStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT, INITIAL_AUDIT);
  },
  addAudit(entry: Omit<AuditLogEntry, "id" | "created_at">): AuditLogEntry {
    const full: AuditLogEntry = {
      ...entry,
      id: "aud_" + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };
    const audit = this.getAudit();
    writeStorage(STORAGE_KEYS.AUDIT, [full, ...audit]);
    return full;
  },
};
