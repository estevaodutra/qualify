import { describe, expect, it } from "vitest";
import { validateOAuthExchangeResult } from "@/services/criafy/oauthResponse";

describe("Criafy OAuth exchange response", () => {
  it("accepts a response containing the persisted account", () => {
    const response = { success: true, count: 1, accounts: [{ id: "account-1" }] };
    expect(validateOAuthExchangeResult(response)).toBe(response);
  });

  it("does not turn a zero-account exchange into a false success", () => {
    expect(() => validateOAuthExchangeResult({ success: true, count: 0, accounts: [] })).toThrow(
      "nenhuma conta"
    );
  });

  it("rejects an inconsistent account count", () => {
    expect(() =>
      validateOAuthExchangeResult({ success: true, count: 1, accounts: [] })
    ).toThrow("incompleta");
  });
});
