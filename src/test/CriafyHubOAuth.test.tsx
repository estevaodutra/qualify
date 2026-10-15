import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CriafyHub from "@/pages/criafy/CriafyHub";

const mocks = vi.hoisted(() => ({
  exchangeOAuthCode: vi.fn(),
  getAccounts: vi.fn(),
  setSearchParams: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastLoading: vi.fn(),
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({ activeCompany: { name: "Acme" }, activeCompanyId: "company-1" }),
}));

vi.mock("@/services/criafy/criafyService", () => ({
  criafyService: {
    exchangeOAuthCode: mocks.exchangeOAuthCode,
    getAccounts: mocks.getAccounts,
  },
}));

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [
    new URLSearchParams("code=oauth-code&state=signed-state"),
    mocks.setSearchParams,
  ],
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    loading: mocks.toastLoading,
  },
}));

vi.mock("@/components/criafy/MediaLibraryView", () => ({ MediaLibraryView: () => null }));
vi.mock("@/components/criafy/PublicationsView", () => ({ PublicationsView: () => null }));
vi.mock("@/components/criafy/QueueRulesView", () => ({ QueueRulesView: () => null }));
vi.mock("@/components/criafy/CriafyCalendarView", () => ({ CriafyCalendarView: () => null }));
vi.mock("@/components/criafy/AddAccountModal", () => ({ AddAccountModal: () => null }));
vi.mock("@/components/criafy/AccountBriefingModal", () => ({ AccountBriefingModal: () => null }));

describe("CriafyHub OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeOAuthCode.mockResolvedValue({ success: true, count: 1, accounts: [{ id: "ig-1" }] });
    mocks.getAccounts.mockResolvedValue([]);
  });

  it("exchanges the callback once, refreshes accounts and clears OAuth parameters", async () => {
    render(<CriafyHub />);

    await waitFor(() => expect(mocks.getAccounts).toHaveBeenCalledWith("company-1"));
    expect(mocks.exchangeOAuthCode).toHaveBeenCalledTimes(1);
    expect(mocks.exchangeOAuthCode).toHaveBeenCalledWith(
      "company-1",
      "oauth-code",
      `${window.location.origin}/criafy`,
      "signed-state"
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Sucesso! 1 conta(s) do Instagram conectada(s).",
      { id: "oauth-process" }
    );

    const [cleanedParams, options] = mocks.setSearchParams.mock.calls.at(-1);
    expect(cleanedParams.get("code")).toBeNull();
    expect(cleanedParams.get("state")).toBeNull();
    expect(options).toEqual({ replace: true });
  });
});
