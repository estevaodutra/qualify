import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVersionNotifier } from "@/hooks/useVersionNotifier";

describe("useVersionNotifier", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("initializes without update when baseline matches", () => {
    const { result } = renderHook(() => useVersionNotifier("initial-sha-12345"));
    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.updateInfo).toBeNull();
  });

  it("detects update when remote commit differs from baseline", async () => {
    const initialCommit = "initial-sha-1234567890abcdef";
    const newCommit = "a1b2c3d4e5f67890abcdef1234567890abcdef12";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      if (typeof url === "string" && url.includes("api.github.com")) {
        return {
          ok: true,
          json: async () => [
            {
              sha: newCommit,
              commit: {
                message: "feat: super new feature",
                author: { name: "Dev" },
                committer: { date: "2026-10-05T12:00:00Z" },
              },
            },
          ],
        } as any;
      }
      return { ok: false } as any;
    });

    const { result } = renderHook(() => useVersionNotifier(initialCommit));

    await act(async () => {
      await result.current.checkForUpdate(true);
    });

    expect(result.current.hasUpdate).toBe(true);
    expect(result.current.updateInfo?.commit).toBe(newCommit);
    expect(result.current.updateInfo?.shortCommit).toBe("a1b2c3d");
    expect(result.current.updateInfo?.message).toBe("feat: super new feature");
  });

  it("allows user to dismiss update", async () => {
    const initialCommit = "initial-sha-1234567890abcdef";
    const newCommit = "b2c3d4e5f67890abcdef1234567890abcdef1234";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      if (typeof url === "string" && url.includes("api.github.com")) {
        return {
          ok: true,
          json: async () => [
            {
              sha: newCommit,
              commit: {
                message: "fix: bugfix",
                author: { name: "Dev" },
                committer: { date: "2026-10-05T12:00:00Z" },
              },
            },
          ],
        } as any;
      }
      return { ok: false } as any;
    });

    const { result } = renderHook(() => useVersionNotifier(initialCommit));

    await act(async () => {
      await result.current.checkForUpdate(true);
    });

    expect(result.current.hasUpdate).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.hasUpdate).toBe(false);
    expect(sessionStorage.getItem("dismissed_version_sha")).toBe(newCommit);
  });
});
