// Vercel Serverless Function: Auto-publishes due Criafy scheduled posts
const SUPABASE_URL = "https://qualify-supabase.d2x.site";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODYwNjQ2MzEsImV4cCI6MjEwMTQyNDYzMX0.uTb3j5LmhaahnXkSLXQGoDpAjYAnW2UxCmiK0pnfshU";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // Allow GET and POST (for Vercel Cron, pg_cron, or manual healthcheck)
  try {
    const nowIso = new Date().toISOString();

    // 1. Fetch up to 10 overdue scheduled publications
    const queryUrl = `${SUPABASE_URL}/rest/v1/criafy_publications?status=eq.SCHEDULED&scheduled_at=lte.${encodeURIComponent(
      nowIso
    )}&publication_type=in.(FEED,REEL,STORY_IMAGE,STORY_VIDEO)&select=id,company_id,account_id,publication_type,scheduled_at&order=scheduled_at.asc&limit=10`;

    const fetchRes = await fetch(queryUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      return res.status(500).json({
        success: false,
        error: `Failed to query scheduled publications: ${errText}`,
      });
    }

    const pendingPubs = await fetchRes.json();
    const results = [];

    // 2. Publish each due post via criafy-publish-job
    for (const pub of pendingPubs || []) {
      try {
        const publishRes = await fetch(
          `${SUPABASE_URL}/functions/v1/criafy-publish-job`,
          {
            method: "POST",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ publicationId: pub.id }),
          }
        );

        const pubJson = await publishRes.json();
        results.push({
          id: pub.id,
          type: pub.publication_type,
          success: !!pubJson.success,
          permalink: pubJson.igPermalink || null,
          error: pubJson.error || null,
        });
      } catch (itemErr) {
        results.push({
          id: pub.id,
          type: pub.publication_type,
          success: false,
          error: itemErr.message,
        });
      }
    }

    // Social posts use their own validated publishing APIs and saved account options.
    const socialUrl = `${SUPABASE_URL}/rest/v1/criafy_publications?status=eq.SCHEDULED&scheduled_at=lte.${encodeURIComponent(nowIso)}&publication_type=in.(TIKTOK_VIDEO,YOUTUBE_SHORT)&select=id,publication_type&order=scheduled_at.asc&limit=3`;
    const socialRes = await fetch(socialUrl, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!socialRes.ok) throw new Error(`Failed to query scheduled social posts: ${socialRes.status}`);
    const socialPosts = await socialRes.json();
    for (const pub of socialPosts) {
      const functionName = pub.publication_type === "TIKTOK_VIDEO" ? "criafy-tiktok-post" : "criafy-youtube-post";
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
          method: "POST",
          headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json" },
          body: JSON.stringify({ action: "run-scheduled", publicationId: pub.id }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || `HTTP ${response.status}`);
        results.push({ id: pub.id, type: pub.publication_type, success: true });
      } catch (error) {
        const reason = String(error.message || error).slice(0, 1000);
        await fetch(`${SUPABASE_URL}/rest/v1/criafy_publications?id=eq.${pub.id}&status=eq.SCHEDULED`, {
          method: "PATCH",
          headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json" },
          body: JSON.stringify({ status: "FAILED",
            [pub.publication_type === "TIKTOK_VIDEO" ? "tiktok_failure_reason" : "youtube_failure_reason"]: reason }),
        });
        results.push({ id: pub.id, type: pub.publication_type, success: false, error: reason });
      }
    }

    // Resume scheduled YouTube uploads in bounded chunks on each cron tick.
    const activeUrl = `${SUPABASE_URL}/rest/v1/criafy_publications?status=eq.PUBLISHING&publication_type=eq.YOUTUBE_SHORT&scheduled_at=not.is.null&youtube_video_id=is.null&select=id&order=scheduled_at.asc&limit=1`;
    const activeRes = await fetch(activeUrl, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (activeRes.ok) {
      const activeUploads = await activeRes.json();
      for (const pub of activeUploads) {
        try {
          for (let part = 0; part < 2; part++) {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/criafy-youtube-post`, {
              method: "POST",
              headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json" },
              body: JSON.stringify({ action: "upload-step", publicationId: pub.id }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || `HTTP ${response.status}`);
            if (data.publication?.youtube_video_id) break;
          }
        } catch (error) {
          console.error(`Scheduled YouTube upload ${pub.id}:`, error.message);
        }
      }
    }
    const processingUrl = `${SUPABASE_URL}/rest/v1/criafy_publications?status=eq.PUBLISHING&publication_type=eq.YOUTUBE_SHORT&scheduled_at=not.is.null&youtube_video_id=not.is.null&select=id&order=scheduled_at.asc&limit=5`;
    const processingRes = await fetch(processingUrl, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (processingRes.ok) {
      for (const pub of await processingRes.json()) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/criafy-youtube-post`, {
            method: "POST",
            headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json" },
            body: JSON.stringify({ action: "status", publicationId: pub.id }),
          });
        } catch (error) {
          console.error(`Scheduled YouTube status ${pub.id}:`, error.message);
        }
      }
    }
    const tikTokProcessingUrl = `${SUPABASE_URL}/rest/v1/criafy_publications?status=eq.PUBLISHING&publication_type=eq.TIKTOK_VIDEO&scheduled_at=not.is.null&tiktok_publish_id=not.is.null&select=id&order=scheduled_at.asc&limit=5`;
    const tikTokProcessingRes = await fetch(tikTokProcessingUrl, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (tikTokProcessingRes.ok) {
      for (const pub of await tikTokProcessingRes.json()) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/criafy-tiktok-post`, {
            method: "POST",
            headers: { apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json" },
            body: JSON.stringify({ action: "status", publicationId: pub.id }),
          });
        } catch (error) {
          console.error(`Scheduled TikTok status ${pub.id}:`, error.message);
        }
      }
    }

    // 3. Redundancy: Check if any connected Instagram account has insights older than 60 min
    let triggeredMetricsSync = false;
    try {
      const accUrl = `${SUPABASE_URL}/rest/v1/criafy_instagram_accounts?connection_status=eq.CONNECTED&select=id,metadata&limit=10`;
      const accRes = await fetch(accUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      if (accRes.ok) {
        const accs = await accRes.json();
        const hasStaleAccount = (accs || []).some((a) => {
          const last = a.metadata?.insights_synced_at;
          if (!last) return true;
          const diffMs = Date.now() - new Date(last).getTime();
          return diffMs > 60 * 60 * 1000;
        });

        if (hasStaleAccount) {
          triggeredMetricsSync = true;
          const host = req.headers?.["host"] || "qualifys.app";
          const proto = host.includes("localhost") ? "http" : "https";
          // Trigger hourly sync cron in background
          fetch(`${proto}://${host}/api/criafy-metrics-sync-cron`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }).catch((e) => console.warn("Failed to trigger criafy-metrics-sync-cron from scheduler:", e.message));
        }
      }
    } catch (staleErr) {
      console.warn("Error checking stale accounts in scheduler:", staleErr.message);
    }

    return res.status(200).json({
      success: true,
      timestamp: nowIso,
      checkedCount: pendingPubs.length,
      publishedCount: results.filter((r) => r.success &&
        ["FEED", "REEL", "STORY_IMAGE", "STORY_VIDEO"].includes(r.type)).length,
      socialStartedCount: results.filter((r) => r.success &&
        ["TIKTOK_VIDEO", "YOUTUBE_SHORT"].includes(r.type)).length,
      triggeredMetricsSync,
      results,
    });
  } catch (err) {
    console.error("Error in criafy-scheduler-worker:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
