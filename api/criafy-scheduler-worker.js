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
    )}&select=id,company_id,account_id,publication_type,scheduled_at&order=scheduled_at.asc&limit=10`;

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

    return res.status(200).json({
      success: true,
      timestamp: nowIso,
      checkedCount: pendingPubs.length,
      publishedCount: results.filter((r) => r.success).length,
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
