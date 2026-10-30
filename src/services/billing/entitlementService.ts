import { billingStore } from "./billingStore";
import { CreditService, ConsumeResult } from "./creditService";
import { Plan, PlanLimit, Subscription } from "./types";

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  limitType: PlanLimit["limit_type"];
  limitValue: number | null;
  currentUsage?: number;
  availableCredits?: number;
}

export const EntitlementService = {
  /**
   * Obtém o plano e status da assinatura da empresa
   */
  getPlan(companyId: string): { plan: Plan; subscription?: Subscription } {
    const plan = billingStore.getPlan();
    const subscription = billingStore.getSubscriptionByCompany(companyId);
    return { plan, subscription };
  },

  /**
   * Obtém a configuração de limite de um recurso
   */
  getLimit(resourceKey: string): PlanLimit | undefined {
    const limits = billingStore.getLimits();
    return limits.find((l) => l.resource_key === resourceKey && l.is_active);
  },

  /**
   * Obtém todos os limites vigentes
   */
  getAllLimits(): PlanLimit[] {
    return billingStore.getLimits();
  },

  /**
   * Verifica se a empresa tem autorização para utilizar um recurso
   */
  canUse(
    companyId: string,
    resourceKey: string,
    quantity = 1,
    currentUsage = 0
  ): EntitlementCheckResult {
    const limit = this.getLimit(resourceKey);

    // Se não há regra configurada, por padrão de projeto é ilimitado
    if (!limit) {
      return {
        allowed: true,
        limitType: "unlimited",
        limitValue: null,
      };
    }

    if (limit.limit_type === "disabled") {
      return {
        allowed: false,
        reason: `O recurso '${limit.resource_name}' está temporariamente desativado na plataforma.`,
        limitType: "disabled",
        limitValue: 0,
      };
    }

    if (limit.limit_type === "unlimited") {
      return {
        allowed: true,
        limitType: "unlimited",
        limitValue: null,
      };
    }

    if (limit.limit_type === "fixed") {
      const maxAllowed = limit.limit_value ?? 0;
      if (currentUsage + quantity > maxAllowed) {
        return {
          allowed: false,
          reason: `Limite de ${limit.resource_name} atingido (${currentUsage}/${maxAllowed} ${limit.unit}). Solicite expansão ao administrador.`,
          limitType: "fixed",
          limitValue: maxAllowed,
          currentUsage,
        };
      }
      return {
        allowed: true,
        limitType: "fixed",
        limitValue: maxAllowed,
        currentUsage,
      };
    }

    if (limit.limit_type === "credit_based") {
      const wallet = CreditService.getWallet(companyId);
      const totalAvailable = wallet.purchased_balance + wallet.bonus_balance;

      // Localiza a taxa de consumo se houver
      const rates = billingStore.getRates();
      const rate = rates.find((r) => r.resource_key === resourceKey);
      const requiredAmount = rate ? rate.credits_per_unit * quantity : quantity;

      if (totalAvailable < requiredAmount) {
        return {
          allowed: false,
          reason: `Saldo de créditos insuficiente. Disponível: R$ ${totalAvailable.toFixed(2)} | Necessário: R$ ${requiredAmount.toFixed(2)}.`,
          limitType: "credit_based",
          limitValue: null,
          availableCredits: totalAvailable,
        };
      }

      return {
        allowed: true,
        limitType: "credit_based",
        limitValue: null,
        availableCredits: totalAvailable,
      };
    }

    return {
      allowed: true,
      limitType: "unlimited",
      limitValue: null,
    };
  },

  /**
   * Verifica se a empresa tem saldo de créditos suficiente
   */
  hasCredits(companyId: string, requiredCredits: number): boolean {
    const wallet = CreditService.getWallet(companyId);
    return wallet.purchased_balance + wallet.bonus_balance >= requiredCredits;
  },

  /**
   * Consome créditos para execução de um recurso
   */
  consumeCredits(
    companyId: string,
    resourceKey: string,
    amount: number,
    description: string
  ): ConsumeResult {
    return CreditService.consumeCredits(companyId, amount, resourceKey, description);
  },
};
