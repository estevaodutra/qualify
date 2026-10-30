import { billingStore } from "./billingStore";
import { CreditService } from "./creditService";
import { SignupOffer, Subscription } from "./types";

export interface ResolvedOfferBenefits {
  isValid: boolean;
  error?: string;
  offer?: SignupOffer;
  planName: string;
  planPrice: number;
  trialDays: number;
  bonusAmount: number;
  requiresPaymentMethod: boolean;
}

export const SignupOfferService = {
  /**
   * Lista todas as ofertas de cadastro
   */
  getOffers(): SignupOffer[] {
    return billingStore.getOffers();
  },

  /**
   * Cria ou atualiza um link de cadastro
   */
  saveOffer(
    offerData: Omit<SignupOffer, "id" | "redemption_count" | "created_at" | "updated_at"> & {
      id?: string;
    },
    actorName = "Super Admin"
  ): SignupOffer {
    const existing = offerData.id
      ? billingStore.getOffers().find((o) => o.id === offerData.id)
      : undefined;

    const offer: SignupOffer = {
      id: offerData.id || "off_" + Math.random().toString(36).substring(2, 9),
      name: offerData.name,
      token: offerData.token.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "-"),
      plan_id: offerData.plan_id || "plan_qualify_standard",
      trial_enabled: offerData.trial_enabled ?? true,
      trial_days: offerData.trial_days || 7,
      bonus_credits: offerData.bonus_credits !== undefined ? offerData.bonus_credits : null,
      max_redemptions: offerData.max_redemptions || null,
      redemption_count: existing ? existing.redemption_count : 0,
      expires_at: offerData.expires_at || null,
      campaign: offerData.campaign,
      status: offerData.status || "active",
      created_by: actorName,
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return billingStore.saveOffer(offer, actorName);
  },

  /**
   * Resolve o token seguro sem confiar em parâmetros arbitrários da query string
   */
  resolveOffer(token?: string): ResolvedOfferBenefits {
    const plan = billingStore.getPlan();
    const trialSettings = billingStore.getTrialSettings();
    const bonusSettings = billingStore.getBonusSettings();

    // Se nenhum token for informado, aplica a política de cadastro padrão global
    if (!token) {
      return {
        isValid: true,
        planName: plan.name,
        planPrice: plan.price,
        trialDays: trialSettings.enabled ? trialSettings.duration_days : 0,
        bonusAmount: bonusSettings.enabled && bonusSettings.apply_on_signup
          ? bonusSettings.default_bonus_amount
          : 0,
        requiresPaymentMethod: trialSettings.require_payment_method,
      };
    }

    const offer = billingStore.getOffers().find(
      (o) => o.token.toLowerCase() === token.toLowerCase()
    );

    if (!offer) {
      return {
        isValid: false,
        error: "Link de cadastro não encontrado ou expirado.",
        planName: plan.name,
        planPrice: plan.price,
        trialDays: 0,
        bonusAmount: 0,
        requiresPaymentMethod: false,
      };
    }

    if (offer.status !== "active") {
      return {
        isValid: false,
        error: "Este link de cadastro foi desativado.",
        planName: plan.name,
        planPrice: plan.price,
        trialDays: 0,
        bonusAmount: 0,
        requiresPaymentMethod: false,
      };
    }

    if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
      return {
        isValid: false,
        error: "A validade desta campanha promocional já expirou.",
        planName: plan.name,
        planPrice: plan.price,
        trialDays: 0,
        bonusAmount: 0,
        requiresPaymentMethod: false,
      };
    }

    if (offer.max_redemptions && offer.redemption_count >= offer.max_redemptions) {
      return {
        isValid: false,
        error: "O limite de cadastros para este link promocional foi atingido.",
        planName: plan.name,
        planPrice: plan.price,
        trialDays: 0,
        bonusAmount: 0,
        requiresPaymentMethod: false,
      };
    }

    // Regra da Seção 22: O link pode sobrescrever o bônus global. Se offer.bonus_credits for informado, usa ele, senão usa global.
    const effectiveBonus =
      offer.bonus_credits !== null
        ? offer.bonus_credits
        : bonusSettings.enabled && bonusSettings.apply_on_signup
        ? bonusSettings.default_bonus_amount
        : 0;

    const effectiveTrialDays = offer.trial_enabled ? offer.trial_days : 0;

    return {
      isValid: true,
      offer,
      planName: plan.name,
      planPrice: plan.price,
      trialDays: effectiveTrialDays,
      bonusAmount: effectiveBonus,
      requiresPaymentMethod: trialSettings.require_payment_method,
    };
  },

  /**
   * Executa o provisionamento atômico ao criar uma nova empresa via link de cadastro:
   * 1. Cria a wallet
   * 2. Associa o Plano Qualify (R$ 197)
   * 3. Aplica o bônus com lançamento no ledger
   * 4. Inicia o trial na assinatura (status 'trialing')
   * 5. Incrementa a contagem de resgates da oferta
   */
  applyOfferToNewCompany(
    companyId: string,
    companyName: string,
    token?: string
  ): { subscription: Subscription; bonusGranted: number } {
    const benefits = this.resolveOffer(token);
    const plan = billingStore.getPlan();

    // 1. Cria ou inicializa a carteira
    const wallet = CreditService.getWallet(companyId);

    // 2. Concede bônus se houver valor
    if (benefits.bonusAmount > 0) {
      const reason = benefits.offer
        ? `Bônus Oferta: ${benefits.offer.name}`
        : "Bônus de Boas-Vindas";

      CreditService.addBonusCredits(companyId, benefits.bonusAmount, reason, {
        createdBy: "Sistema de Onboarding",
        note: benefits.offer ? `Campanha ${benefits.offer.campaign || "Link Direto"}` : undefined,
      });
    }

    // 3. Inicializa a assinatura
    const now = new Date();
    const trialDays = benefits.trialDays;
    const isTrialing = trialDays > 0;

    const subscription: Subscription = {
      id: "sub_" + Math.random().toString(36).substring(2, 9),
      company_id: companyId,
      company_name: companyName,
      plan_id: plan.id,
      plan_name: plan.name,
      status: isTrialing ? "trialing" : "active",
      price_snapshot: plan.price,
      currency: plan.currency,
      billing_interval: plan.billing_interval,
      trial_started_at: isTrialing ? now.toISOString() : null,
      trial_ends_at: isTrialing
        ? new Date(now.getTime() + trialDays * 86400000).toISOString()
        : null,
      current_period_start: now.toISOString(),
      current_period_end: new Date(now.getTime() + 30 * 86400000).toISOString(),
      cancel_at_period_end: false,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    billingStore.saveSubscription(subscription, "Sistema de Onboarding");

    // 4. Incrementa contador de resgate da oferta se utilizada
    if (benefits.offer) {
      const updatedOffer: SignupOffer = {
        ...benefits.offer,
        redemption_count: benefits.offer.redemption_count + 1,
        updated_at: new Date().toISOString(),
      };
      billingStore.saveOffer(updatedOffer, "Sistema de Onboarding");
    }

    return { subscription, bonusGranted: benefits.bonusAmount };
  },
};
