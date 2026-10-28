export const config = {
  runtime: "edge",
};

const SUPABASE_PUBLIC_MEDIA_BASE =
  "https://qualify-supabase.d2x.site/storage/v1/object/public/media/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
  "Accept-Ranges": "bytes",
};

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const manifestPath = url.searchParams.get("manifest");
    if (!manifestPath) {
      return new Response("Missing manifest parameter", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const manifestUrl = manifestPath.startsWith("http")
      ? manifestPath
      : `${SUPABASE_PUBLIC_MEDIA_BASE}${manifestPath.replace(/^\/+/, "")}`;

    const manifestRes = await fetch(manifestUrl);
    if (!manifestRes.ok) {
      return new Response("Manifest not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const manifest = await manifestRes.json();
    const totalSize = Number(manifest.totalSize || 0);
    const mimeType = manifest.mimeType || "video/mp4";
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];

    if (!totalSize || chunks.length === 0) {
      return new Response("Invalid manifest", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Build byte offset map for each chunk
    let runningOffset = 0;
    const chunkMeta = chunks.map((c) => {
      const size = Number(c.size);
      const start = runningOffset;
      const end = runningOffset + size - 1;
      runningOffset += size;
      return {
        url: c.url,
        size,
        start,
        end,
      };
    });

    if (req.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": mimeType,
          "Content-Length": String(totalSize),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const rangeHeader = req.headers.get("range");
    let rangeStart = 0;
    let rangeEnd = totalSize - 1;
    let isPartial = false;

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const parsedStart = parseInt(parts[0], 10);
      const parsedEnd = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (!isNaN(parsedStart)) {
        rangeStart = Math.max(0, Math.min(parsedStart, totalSize - 1));
        rangeEnd = !isNaN(parsedEnd)
          ? Math.max(rangeStart, Math.min(parsedEnd, totalSize - 1))
          : totalSize - 1;
        isPartial = true;
      }
    }

    const contentLength = rangeEnd - rangeStart + 1;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const chunk of chunkMeta) {
            if (chunk.end < rangeStart) continue;
            if (chunk.start > rangeEnd) break;

            const localStart = Math.max(0, rangeStart - chunk.start);
            const localEnd = Math.min(chunk.size - 1, rangeEnd - chunk.start);

            const headers = {};
            if (localStart > 0 || localEnd < chunk.size - 1) {
              headers["Range"] = `bytes=${localStart}-${localEnd}`;
            }

            const chunkRes = await fetch(chunk.url, { headers });
            if (!chunkRes.ok || !chunkRes.body) {
              throw new Error(
                `Failed to fetch chunk ${chunk.url}: ${chunkRes.status}`
              );
            }

            const reader = chunkRes.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    const responseHeaders = {
      ...corsHeaders,
      "Content-Type": mimeType,
      "Content-Length": String(contentLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (isPartial) {
      responseHeaders["Content-Range"] = `bytes ${rangeStart}-${rangeEnd}/${totalSize}`;
    }

    return new Response(stream, {
      status: isPartial ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(`Stream error: ${err.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
