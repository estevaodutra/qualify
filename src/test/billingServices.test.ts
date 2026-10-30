import { describe, it, expect, beforeEach } from "vitest";
import { billingStore } from "@/services/billing/billingStore";
import { CreditService } from "@/services/billing/creditService";
import { EntitlementService } from "@/services/billing/entitlementService";
import { SignupOfferService } from "@/services/billing/signupOfferService";

describe("Billing & Entitlement Core Services", () => {
  const TEST_COMPANY = "company_test_suite_1";

  beforeEach(() => {
    // Reset test company wallet to 0
    billingStore.updateWallet({
      id: "w_test",
      company_id: TEST_COMPANY,
      purchased_balance: 0,
      bonus_balance: 0,
      total_available: 0,
      updated_at: new Date().toISOString(),
    });
  });

  it("should have single Qualify plan configured at R$ 197/mês", () => {
    const plan = billingStore.getPlan();
    expect(plan.name).toBe("Qualify");
    expect(plan.slug).toBe("qualify");
    expect(plan.price).toBe(197.0);
    expect(plan.billing_interval).toBe("month");
    expect(plan.status).toBe("active");
  });

  it("should provide unlimited dispatches, conversations and workflows by default", () => {
    const messagesLimit = EntitlementService.getLimit("messages");
    expect(messagesLimit?.limit_type).toBe("unlimited");

    const conversationsLimit = EntitlementService.getLimit("conversations");
    expect(conversationsLimit?.limit_type).toBe("unlimited");

    const workflowsLimit = EntitlementService.getLimit("workflows");
    expect(workflowsLimit?.limit_type).toBe("unlimited");

    const check = EntitlementService.canUse(TEST_COMPANY, "messages", 5000);
    expect(check.allowed).toBe(true);
    expect(check.limitType).toBe("unlimited");
  });

  it("should enforce fixed limit on WhatsApp connections", () => {
    const whatsappLimit = EntitlementService.getLimit("whatsapp_connections");
    expect(whatsappLimit?.limit_type).toBe("fixed");
    const maxVal = whatsappLimit?.limit_value ?? 2;

    // Below limit
    const check1 = EntitlementService.canUse(TEST_COMPANY, "whatsapp_connections", 1, 0);
    expect(check1.allowed).toBe(true);

    // Over limit
    const check2 = EntitlementService.canUse(TEST_COMPANY, "whatsapp_connections", 1, maxVal);
    expect(check2.allowed).toBe(false);
    expect(check2.reason).toContain("Limite de Conexões WhatsApp atingido");
  });

  it("should segregate purchased vs bonus credits in the wallet", () => {
    // Add purchased credits
    CreditService.addPurchasedCredits(TEST_COMPANY, 50, "Recarga PIX");

    // Add bonus credits
    CreditService.addBonusCredits(TEST_COMPANY, 10, "Amostra comercial", {
      createdBy: "Admin Test",
    });

    const wallet = CreditService.getWallet(TEST_COMPANY);
    expect(wallet.purchased_balance).toBe(50);
    expect(wallet.bonus_balance).toBe(10);
    expect(wallet.total_available).toBe(60);
  });

  it("should consume bonus credits first by default (bonus_first)", () => {
    // Setup balances
    CreditService.addPurchasedCredits(TEST_COMPANY, 20, "Recarga");
    CreditService.addBonusCredits(TEST_COMPANY, 5, "Bônus boas-vindas");

    // Consume R$ 3
    const result = CreditService.consumeCredits(TEST_COMPANY, 3, "ai", "Geração de Conteúdo IA");
    expect(result.success).toBe(true);
    expect(result.consumedBonus).toBe(3);
    expect(result.consumedPurchased).toBe(0);

    const wallet = CreditService.getWallet(TEST_COMPANY);
    expect(wallet.bonus_balance).toBe(2);
    expect(wallet.purchased_balance).toBe(20);
    expect(wallet.total_available).toBe(22);

    // Consume R$ 5 (should take remaining R$ 2 bonus + R$ 3 purchased)
    const result2 = CreditService.consumeCredits(TEST_COMPANY, 5, "ai", "Roteiro Reels");
    expect(result2.success).toBe(true);
    expect(result2.consumedBonus).toBe(2);
    expect(result2.consumedPurchased).toBe(3);

    const walletAfter = CreditService.getWallet(TEST_COMPANY);
    expect(walletAfter.bonus_balance).toBe(0);
    expect(walletAfter.purchased_balance).toBe(17);
    expect(walletAfter.total_available).toBe(17);
  });

  it("should fail gracefully when credit balance is insufficient", () => {
    CreditService.addBonusCredits(TEST_COMPANY, 2, "Bônus pequeno");

    const result = CreditService.consumeCredits(TEST_COMPANY, 10, "ai", "Chamada cara de IA");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Saldo insuficiente");
  });

  it("should resolve signup offer tokens securely without trusting query parameters", () => {
    // Default offer resolution
    const resolved = SignupOfferService.resolveOffer("qualify-trial-7d");
    expect(resolved.isValid).toBe(true);
    expect(resolved.trialDays).toBe(7);
    expect(resolved.bonusAmount).toBe(5.0);

    // Invalid token
    const invalid = SignupOfferService.resolveOffer("token-inexistente-hack");
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toContain("não encontrado");
  });

  it("should record every balance change in the ledger (credit_transactions)", () => {
    const txBefore = CreditService.getTransactions(TEST_COMPANY).length;

    CreditService.addBonusCredits(TEST_COMPANY, 15, "Compensação");

    const txAfter = CreditService.getTransactions(TEST_COMPANY);
    expect(txAfter.length).toBe(txBefore + 1);

    const lastTx = txAfter[0];
    expect(lastTx.amount).toBe(15);
    expect(lastTx.wallet_type).toBe("bonus");
    expect(lastTx.type).toBe("bonus");
  });
});
