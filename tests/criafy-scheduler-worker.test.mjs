import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/criafy-scheduler-worker.js";

test("routes due Instagram, TikTok and YouTube publications to their own publishers", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, body: options.body ? JSON.parse(options.body) : null });
    const json = (data) => ({ ok: true, status: 200, json: async () => data });
    if (target.includes("criafy_publications?status=eq.SCHEDULED") &&
        target.includes("publication_type=in.(FEED")) {
      return json([{ id: "instagram", publication_type: "REEL" }]);
    }
    if (target.includes("criafy_publications?status=eq.SCHEDULED") &&
        target.includes("publication_type=in.(TIKTOK_VIDEO")) {
      return json([{ id: "tiktok", publication_type: "TIKTOK_VIDEO" },
        { id: "youtube", publication_type: "YOUTUBE_SHORT" }]);
    }
    if (target.includes("youtube_video_id=is.null")) return json([{ id: "youtube" }]);
    if (target.includes("youtube_video_id=not.is.null")) return json([]);
    if (target.includes("tiktok_publish_id=not.is.null")) return json([]);
    if (target.includes("criafy_instagram_accounts?")) return json([]);
    if (target.includes("criafy-youtube-post") && options.body) {
      const action = JSON.parse(options.body).action;
      return json({ success: true, publication: action === "upload-step"
        ? { youtube_video_id: "uploaded" } : { id: "youtube" } });
    }
    return json({ success: true });
  };
  const response = { status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  try {
    await handler({ headers: { host: "example.test" } }, response);
    assert.equal(response.code, 200);
    assert.equal(response.data.publishedCount, 1);
    assert.equal(response.data.socialStartedCount, 2);
    const publisherCalls = calls.filter((call) => call.target.includes("/functions/v1/"));
    assert.deepEqual(publisherCalls.map((call) => [call.target.split("/").pop(), call.body?.action || call.body?.publicationId]), [
      ["criafy-publish-job", "instagram"],
      ["criafy-tiktok-post", "run-scheduled"],
      ["criafy-youtube-post", "run-scheduled"],
      ["criafy-youtube-post", "upload-step"],
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
