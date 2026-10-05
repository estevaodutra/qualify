import { useState, useEffect, useCallback, useRef } from "react";

export interface VersionUpdateInfo {
  commit: string;
  shortCommit: string;
  message: string;
  author?: string;
  date?: string;
  source: "github" | "server" | "dev";
}

const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || "estevaodutra/qualify";
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || "master";
const POLL_INTERVAL_MS = 35 * 1000; // 35 seconds
const MIN_RECHECK_INTERVAL_MS = 15 * 1000; // 15 seconds debounce on focus

export function useVersionNotifier(initialBaseline?: string) {
  // Current loaded commit at the time of app build or initial load
  const initialAppCommit =
    initialBaseline ||
    (typeof __APP_COMMIT_HASH__ !== "undefined" && __APP_COMMIT_HASH__
      ? __APP_COMMIT_HASH__.trim()
      : null);

  const [currentCommit, setCurrentCommit] = useState<string | null>(initialAppCommit);
  const [updateInfo, setUpdateInfo] = useState<VersionUpdateInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const lastCheckedAtRef = useRef<number>(0);
  const currentCommitRef = useRef<string | null>(initialAppCommit);

  useEffect(() => {
    currentCommitRef.current = currentCommit;
  }, [currentCommit]);

  const checkForUpdate = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheckedAtRef.current < MIN_RECHECK_INTERVAL_MS && lastCheckedAtRef.current > 0) {
      return;
    }
    lastCheckedAtRef.current = now;
    setIsChecking(true);

    try {
      let remoteCommit: string | null = null;
      let remoteMessage = "";
      let remoteAuthor = "";
      let remoteDate = "";
      let source: VersionUpdateInfo["source"] = "github";

      // 1. In dev mode, check local git server endpoint first for instant reflection
      if (import.meta.env.DEV) {
        try {
          const devRes = await fetch(`/__git_version?_t=${now}`);
          if (devRes.ok) {
            const devData = await devRes.json();
            if (devData.commit) {
              remoteCommit = devData.commit;
              remoteMessage = devData.message || "";
              remoteDate = devData.builtAt || "";
              source = "dev";
            }
          }
        } catch {
          // fallback to github
        }
      }

      // 2. Query GitHub Commits API (detects git push immediately on GitHub)
      if (!remoteCommit) {
        try {
          const ghRes = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/commits?sha=${GITHUB_BRANCH}&per_page=1`,
            {
              headers: {
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          if (ghRes.ok) {
            const commits = await ghRes.json();
            if (Array.isArray(commits) && commits.length > 0) {
              const latest = commits[0];
              remoteCommit = latest.sha;
              remoteMessage = latest.commit?.message?.split("\n")[0] || "";
              remoteAuthor = latest.commit?.author?.name || "";
              remoteDate = latest.commit?.committer?.date || "";
              source = "github";
            }
          }
        } catch (ghErr) {
          console.warn("[VersionNotifier] GitHub API check skipped/failed, falling back to static version.json", ghErr);
        }
      }

      // 3. Fallback to /version.json on server
      if (!remoteCommit) {
        try {
          const verRes = await fetch(`/version.json?_t=${now}`, {
            cache: "no-store",
          });
          if (verRes.ok) {
            const verData = await verRes.json();
            if (verData.commit) {
              remoteCommit = verData.commit;
              remoteMessage = verData.message || "";
              remoteDate = verData.builtAt || "";
              source = "server";
            }
          }
        } catch (verErr) {
          console.warn("[VersionNotifier] /version.json check failed", verErr);
        }
      }

      if (!remoteCommit) {
        setIsChecking(false);
        return;
      }

      const activeBaseline = currentCommitRef.current;

      // If we didn't have an active baseline yet, set this as the baseline
      if (!activeBaseline) {
        setCurrentCommit(remoteCommit);
        currentCommitRef.current = remoteCommit;
        setIsChecking(false);
        return;
      }

      // Compare remote commit with active baseline
      if (remoteCommit !== activeBaseline) {
        // Check if user already dismissed this specific commit in this session
        const dismissedSha = sessionStorage.getItem("dismissed_version_sha");
        if (dismissedSha === remoteCommit) {
          setIsChecking(false);
          return;
        }

        setUpdateInfo({
          commit: remoteCommit,
          shortCommit: remoteCommit.substring(0, 7),
          message: remoteMessage,
          author: remoteAuthor,
          date: remoteDate,
          source,
        });
        setHasUpdate(true);
      }
    } catch (err) {
      console.warn("[VersionNotifier] Error checking for version updates:", err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Dismiss notification for the current commit
  const dismiss = useCallback(() => {
    if (updateInfo?.commit) {
      sessionStorage.setItem("dismissed_version_sha", updateInfo.commit);
    }
    setHasUpdate(false);
  }, [updateInfo]);

  // Reload page cleanly to update
  const reloadPage = useCallback(() => {
    if (updateInfo?.commit) {
      // Clear dismissed sha on reload so next updates won't be suppressed
      sessionStorage.removeItem("dismissed_version_sha");
    }

    // Update service worker if registered
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.update();
          });
        })
        .catch(() => {});
    }

    // Small delay to allow any pending storage / sw actions, then force reload
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }, [updateInfo]);

  // Initial check & interval polling
  useEffect(() => {
    // Initial check after 3 seconds
    const initialTimer = setTimeout(() => {
      checkForUpdate();
    }, 3000);

    // Periodic polling
    const intervalTimer = setInterval(() => {
      if (!document.hidden) {
        checkForUpdate();
      }
    }, POLL_INTERVAL_MS);

    // Instant check when user switches back to Qualify window (e.g. after git push in terminal)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdate();
      }
    };

    const handleFocus = () => {
      checkForUpdate();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkForUpdate]);

  return {
    hasUpdate,
    updateInfo,
    isChecking,
    dismiss,
    reloadPage,
    checkForUpdate,
  };
}
