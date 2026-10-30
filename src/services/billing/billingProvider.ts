import { CreditService } from "./creditService";
import { billingStore } from "./billingStore";
import { Subscription } from "./types";

export interface CreateCustomerDTO {
  companyId: string;
  name: string;
  email: string;
  document?: string;
  phone?: string;
}

export interface CreateCheckoutDTO {
  companyId: string;
  type: "subscription" | "credit_topup";
  amount?: number;
  successUrl: string;
  cancelUrl: string;
}

export interface WebhookEventPayload {
  eventId: string;
  eventType:
    | "subscription.created"
    | "subscription.updated"
    | "subscription.canceled"
    | "invoice.paid"
    | "invoice.payment_failed"
    | "payment.credit_recharge";
  data: {
    companyId: string;
    amount?: number;
    subscriptionId?: string;
    customerId?: string;
    paymentMethod?: {
      brand?: string;
      last4?: string;
    };
    referenceId?: string;
  };
}

export interface BillingProvider {
  createCustomer(data: CreateCustomerDTO): Promise<{ customerId: string }>;
  createSubscription(companyId: string, planId: string): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<Subscription>;
  createCheckout(data: CreateCheckoutDTO): Promise<{ checkoutUrl: string; sessionId: string }>;
  getSubscription(companyId: string): Promise<Subscription | undefined>;
  handleWebhook(payload: WebhookEventPayload): Promise<{ processed: boolean; reason?: string }>;
}

// In-memory set to guarantee webhook idempotency
const processedEvents = new Set<string>();

export class QualifyBillingProvider implements BillingProvider {
  async createCustomer(data: CreateCustomerDTO): Promise<{ customerId: string }> {
    const customerId = `cus_${data.companyId.slice(0, 8)}_${Date.now()}`;
    return { customerId };
  }

  async createSubscription(companyId: string, planId: string): Promise<Subscription> {
    const plan = billingStore.getPlan();
    const existing = billingStore.getSubscriptionByCompany(companyId);

    const now = new Date();
    const sub: Subscription = {
      id: existing ? existing.id : "sub_" + Math.random().toString(36).substring(2, 9),
      company_id: companyId,
      plan_id: planId,
      plan_name: plan.name,
      status: "active",
      price_snapshot: plan.price,
      currency: plan.currency,
      billing_interval: plan.billing_interval,
      current_period_start: now.toISOString(),
      current_period_end: new Date(now.getTime() + 30 * 86400000).toISOString(),
      cancel_at_period_end: false,
      created_at: existing ? existing.created_at : now.toISOString(),
      updated_at: now.toISOString(),
    };

    return billingStore.saveSubscription(sub, "Billing Provider");
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subs = billingStore.getSubscriptions();
    const sub = subs.find((s) => s.id === subscriptionId);
    if (!sub) {
      throw new Error(`Assinatura ${subscriptionId} não encontrada.`);
    }

    const updated: Subscription = {
      ...sub,
      status: "canceled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    };

    return billingStore.saveSubscription(updated, "Billing Provider");
  }

  async createCheckout(data: CreateCheckoutDTO): Promise<{ checkoutUrl: string; sessionId: string }> {
    const sessionId = "chk_" + Math.random().toString(36).substring(2, 10);
    // Simula checkout seguro
    const checkoutUrl = `/checkout?session_id=${sessionId}&type=${data.type}&company_id=${data.companyId}`;
    return { checkoutUrl, sessionId };
  }

  async getSubscription(companyId: string): Promise<Subscription | undefined> {
    return billingStore.getSubscriptionByCompany(companyId);
  }

  /**
   * Processador de webhook idempotente:
   * Rejeita payloads duplicados com mesmo eventId para evitar cobranças ou recargas duplas
   */
  async handleWebhook(payload: WebhookEventPayload): Promise<{ processed: boolean; reason?: string }> {
    if (processedEvents.has(payload.eventId)) {
      return {
        processed: false,
        reason: `Evento ${payload.eventId} já foi processado anteriormente (Idempotente).`,
      };
    }

    processedEvents.add(payload.eventId);

    const { companyId, amount, paymentMethod } = payload.data;

    switch (payload.eventType) {
      case "payment.credit_recharge":
      case "invoice.paid": {
        if (amount && amount > 0) {
          CreditService.addPurchasedCredits(
            companyId,
            amount,
            `Recarga aprovada via gateway (Evento ${payload.eventId})`,
            payload.eventId
          );
        }
        break;
      }

      case "subscription.created":
      case "subscription.updated": {
        const sub = billingStore.getSubscriptionByCompany(companyId);
        if (sub) {
          const updated: Subscription = {
            ...sub,
            status: "active",
            payment_method_brand: paymentMethod?.brand || sub.payment_method_brand,
            payment_method_last4: paymentMethod?.last4 || sub.payment_method_last4,
          };
          billingStore.saveSubscription(updated, "Webhook Gateway");
        }
        break;
      }

      case "invoice.payment_failed": {
        const sub = billingStore.getSubscriptionByCompany(companyId);
        if (sub) {
          const updated: Subscription = {
            ...sub,
            status: "past_due",
          };
          billingStore.saveSubscription(updated, "Webhook Gateway");
        }
        break;
      }

      case "subscription.canceled": {
        const sub = billingStore.getSubscriptionByCompany(companyId);
        if (sub) {
          const updated: Subscription = {
            ...sub,
            status: "canceled",
          };
          billingStore.saveSubscription(updated, "Webhook Gateway");
        }
        break;
      }
    }

    return { processed: true };
  }
}

export const billingProvider = new QualifyBillingProvider();
