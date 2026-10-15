import { describe, expect, it } from "vitest";
import {
  createCriafyOAuthState,
  OAUTH_STATE_MAX_AGE_MS,
  verifyCriafyOAuthState,
} from "../../supabase/functions/_shared/criafyOAuthState";

const secret = "test-only-state-secret";
const expected = {
  companyId: "company-1",
  userId: "user-1",
  redirectUri: "https://qualifys.app/criafy",
};

describe("Criafy OAuth state", () => {
  it("accepts an authentic, matching and recent state", async () => {
    const state = await createCriafyOAuthState(
      { ...expected, provider: "INSTAGRAM" },
      secret,
      1_000,
      "nonce-1"
    );

    await expect(verifyCriafyOAuthState(state, secret, expected, 2_000)).resolves.toMatchObject({
      ...expected,
      provider: "INSTAGRAM",
      nonce: "nonce-1",
    });
  });

  it("rejects a tampered state", async () => {
    const state = await createCriafyOAuthState({ ...expected, provider: "INSTAGRAM" }, secret);
    const [payload, signature] = state.split(".");

    await expect(
      verifyCriafyOAuthState(`${payload.slice(0, -1)}A.${signature}`, secret, expected)
    ).rejects.toThrow("Invalid OAuth state signature");
  });

  it("rejects a state for another company or user", async () => {
    const state = await createCriafyOAuthState({ ...expected, provider: "INSTAGRAM" }, secret);

    await expect(
      verifyCriafyOAuthState(state, secret, { ...expected, companyId: "company-2" })
    ).rejects.toThrow("does not match");
  });

  it("rejects an expired state", async () => {
    const state = await createCriafyOAuthState(
      { ...expected, provider: "INSTAGRAM" },
      secret,
      1_000,
      "nonce-1"
    );

    await expect(
      verifyCriafyOAuthState(state, secret, expected, 1_000 + OAUTH_STATE_MAX_AGE_MS + 1)
    ).rejects.toThrow("expired");
  });
});
