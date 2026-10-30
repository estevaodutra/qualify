import { billingStore } from "./billingStore";
import {
  CreditWallet,
  CreditTransaction,
  ConsumptionPriority,
  WalletType,
} from "./types";

export interface ConsumeResult {
  success: boolean;
  error?: string;
  consumedBonus: number;
  consumedPurchased: number;
  newBalance: number;
  transactions: CreditTransaction[];
}

export const CreditService = {
  /**
   * Retorna a carteira da empresa com saldos segregados (comprado vs bônus)
   */
  getWallet(companyId: string): CreditWallet {
    return billingStore.getWalletByCompany(companyId);
  },

  /**
   * Adiciona créditos comprados via gateway/recarga com registro no ledger
   */
  addPurchasedCredits(
    companyId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): { wallet: CreditWallet; transaction: CreditTransaction } {
    if (amount <= 0) {
      throw new Error("O valor da recarga deve ser maior que zero.");
    }

    const wallet = billingStore.getWalletByCompany(companyId);
    const balanceBefore = wallet.purchased_balance;
    const balanceAfter = Number((balanceBefore + amount).toFixed(2));

    const updatedWallet: CreditWallet = {
      ...wallet,
      purchased_balance: balanceAfter,
    };
    billingStore.updateWallet(updatedWallet);

    const transaction = billingStore.addTransaction({
      company_id: companyId,
      wallet_type: "purchased",
      type: "topup",
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description,
      reference_id: referenceId,
    });

    billingStore.addAudit({
      action: "CREDITS_PURCHASED",
      entity_type: "wallet",
      entity_id: wallet.id,
      actor_name: "Gateway / Webhook",
      details: `Recarga de R$ ${amount.toFixed(2)} adicionada à empresa ${companyId}.`,
    });

    return { wallet: billingStore.getWalletByCompany(companyId), transaction };
  },

  /**
   * Adiciona créditos bônus (boas-vindas ou concessão manual do Super Admin)
   */
  addBonusCredits(
    companyId: string,
    amount: number,
    reason: string,
    options?: {
      expiresAt?: string | null;
      createdBy?: string;
      note?: string;
    }
  ): { wallet: CreditWallet; transaction: CreditTransaction } {
    if (amount <= 0) {
      throw new Error("O valor do bônus deve ser maior que zero.");
    }

    const wallet = billingStore.getWalletByCompany(companyId);
    const balanceBefore = wallet.bonus_balance;
    const balanceAfter = Number((balanceBefore + amount).toFixed(2));

    const updatedWallet: CreditWallet = {
      ...wallet,
      bonus_balance: balanceAfter,
    };
    billingStore.updateWallet(updatedWallet);

    const desc = options?.note
      ? `Bônus: ${reason} (${options.note})`
      : `Bônus: ${reason}`;

    const transaction = billingStore.addTransaction({
      company_id: companyId,
      wallet_type: "bonus",
      type: "bonus",
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: desc,
      expires_at: options?.expiresAt,
      created_by: options?.createdBy || "Super Admin",
    });

    billingStore.addAudit({
      action: "BONUS_GRANTED",
      entity_type: "wallet",
      entity_id: wallet.id,
      actor_name: options?.createdBy || "Super Admin",
      details: `Concessão de bônus de R$ ${amount.toFixed(2)} para empresa ${companyId}. Motivo: ${reason}`,
    });

    return { wallet: billingStore.getWalletByCompany(companyId), transaction };
  },

  /**
   * Consome créditos aplicando a ordem configurada (bonus_first ou purchased_first).
   * Nunca permite saldo negativo e registra todas as deduções no ledger de forma atômica.
   */
  consumeCredits(
    companyId: string,
    amount: number,
    resource: string,
    description: string
  ): ConsumeResult {
    if (amount <= 0) {
      return {
        success: false,
        error: "Valor de consumo inválido.",
        consumedBonus: 0,
        consumedPurchased: 0,
        newBalance: 0,
        transactions: [],
      };
    }

    const wallet = billingStore.getWalletByCompany(companyId);
    const totalAvailable = wallet.purchased_balance + wallet.bonus_balance;

    if (totalAvailable < amount) {
      return {
        success: false,
        error: `Saldo insuficiente. Disponível: R$ ${totalAvailable.toFixed(2)} | Necessário: R$ ${amount.toFixed(2)}`,
        consumedBonus: 0,
        consumedPurchased: 0,
        newBalance: totalAvailable,
        transactions: [],
      };
    }

    const bonusSettings = billingStore.getBonusSettings();
    const priority = bonusSettings.consumption_priority;

    let consumedBonus = 0;
    let consumedPurchased = 0;

    let currentBonus = wallet.bonus_balance;
    let currentPurchased = wallet.purchased_balance;
    const generatedTransactions: CreditTransaction[] = [];

    if (priority === "bonus_first") {
      if (currentBonus >= amount) {
        consumedBonus = amount;
      } else {
        consumedBonus = currentBonus;
        consumedPurchased = Number((amount - consumedBonus).toFixed(2));
      }
    } else {
      // purchased_first
      if (currentPurchased >= amount) {
        consumedPurchased = amount;
      } else {
        consumedPurchased = currentPurchased;
        consumedBonus = Number((amount - consumedPurchased).toFixed(2));
      }
    }

    // Processa dedução de bônus se houver
    if (consumedBonus > 0) {
      const before = currentBonus;
      const after = Number((currentBonus - consumedBonus).toFixed(2));
      currentBonus = after;

      const tx = billingStore.addTransaction({
        company_id: companyId,
        wallet_type: "bonus",
        type: "usage",
        amount: -consumedBonus,
        balance_before: before,
        balance_after: after,
        resource,
        description: `${description} (Dedução de Bônus)`,
      });
      generatedTransactions.push(tx);
    }

    // Processa dedução de saldo comprado se houver
    if (consumedPurchased > 0) {
      const before = currentPurchased;
      const after = Number((currentPurchased - consumedPurchased).toFixed(2));
      currentPurchased = after;

      const tx = billingStore.addTransaction({
        company_id: companyId,
        wallet_type: "purchased",
        type: "usage",
        amount: -consumedPurchased,
        balance_before: before,
        balance_after: after,
        resource,
        description: `${description} (Dedução de Saldo Comprado)`,
      });
      generatedTransactions.push(tx);
    }

    // Atualiza a carteira
    const updatedWallet: CreditWallet = {
      ...wallet,
      bonus_balance: currentBonus,
      purchased_balance: currentPurchased,
    };
    billingStore.updateWallet(updatedWallet);

    return {
      success: true,
      consumedBonus,
      consumedPurchased,
      newBalance: currentBonus + currentPurchased,
      transactions: generatedTransactions,
    };
  },

  /**
   * Expira créditos bônus com registro no ledger
   */
  expireBonusCredits(
    companyId: string,
    amount: number,
    reason = "Validade expirada"
  ): { wallet: CreditWallet; transaction: CreditTransaction } {
    const wallet = billingStore.getWalletByCompany(companyId);
    const toExpire = Math.min(wallet.bonus_balance, amount);

    if (toExpire <= 0) {
      throw new Error("Não há saldo bônus elegível para expiração.");
    }

    const before = wallet.bonus_balance;
    const after = Number((before - toExpire).toFixed(2));

    const updatedWallet: CreditWallet = {
      ...wallet,
      bonus_balance: after,
    };
    billingStore.updateWallet(updatedWallet);

    const transaction = billingStore.addTransaction({
      company_id: companyId,
      wallet_type: "bonus",
      type: "expiration",
      amount: -toExpire,
      balance_before: before,
      balance_after: after,
      description: `Expiração de bônus: ${reason}`,
    });

    billingStore.addAudit({
      action: "BONUS_EXPIRED",
      entity_type: "wallet",
      entity_id: wallet.id,
      actor_name: "Sistema / Job",
      details: `Expiração automática de R$ ${toExpire.toFixed(2)} em bônus para a empresa ${companyId}.`,
    });

    return { wallet: billingStore.getWalletByCompany(companyId), transaction };
  },

  /**
   * Reembolsa créditos
   */
  refundCredits(
    companyId: string,
    amount: number,
    walletType: WalletType,
    description: string,
    referenceId?: string
  ): { wallet: CreditWallet; transaction: CreditTransaction } {
    const wallet = billingStore.getWalletByCompany(companyId);
    let before = 0;
    let after = 0;

    let updatedWallet = { ...wallet };
    if (walletType === "bonus") {
      before = wallet.bonus_balance;
      after = Number((before + amount).toFixed(2));
      updatedWallet.bonus_balance = after;
    } else {
      before = wallet.purchased_balance;
      after = Number((before + amount).toFixed(2));
      updatedWallet.purchased_balance = after;
    }

    billingStore.updateWallet(updatedWallet);

    const transaction = billingStore.addTransaction({
      company_id: companyId,
      wallet_type: walletType,
      type: "refund",
      amount,
      balance_before: before,
      balance_after: after,
      description: `Estorno: ${description}`,
      reference_id: referenceId,
    });

    return { wallet: billingStore.getWalletByCompany(companyId), transaction };
  },

  /**
   * Prioridade de consumo atual
   */
  getConsumptionPriority(): ConsumptionPriority {
    return billingStore.getBonusSettings().consumption_priority;
  },

  /**
   * Lista transações
   */
  getTransactions(companyId?: string): CreditTransaction[] {
    return billingStore.getTransactions(companyId);
  },
};
