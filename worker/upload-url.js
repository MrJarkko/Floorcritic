// POST /api/upload-url
//
// Creates a Gemini resumable upload session and returns its URL. The browser
// then slices the video and sends each piece to /api/upload-chunk, which
// forwards it here-side to Google (see upload-chunk.js for why the browser
// cannot talk to Google directly, and for the SSRF guard on this URL).
//
// GEMINI_API_KEY is needed only to open the session and never leaves the Worker.

const GEMINI = "https://generativelanguage.googleapis.com";
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // Gemini Files API per-file limit

// Best-effort in-memory rate limit. NOTE: Workers run many short-lived isolates,
// so this is advisory only — durable limiting needs Workers KV (see roadmap).
const ipBuckets = new Map();
const IP_WINDOW_MS = 3600_000;
const IP_MAX = 15;

function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= IP_MAX) {
    const mins = Math.ceil((bucket.resetAt - now) / 60000);
    return { ok: false, reason: `Upload rate limit. Try again in ${mins} minutes.` };
  }
  bucket.count++;
  return { ok: true };
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function handleUploadUrl(request, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: "Missing GEMINI_API_KEY" }, 500);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.ok) return json({ error: rl.reason }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { displayName, mimeType, numBytes } = body || {};
  if (!displayName || !mimeType || !numBytes) {
    return json({ error: "Missing displayName, mimeType, or numBytes" }, 400);
  }
  if (numBytes > MAX_BYTES) {
    return json({ error: `File too large (${(numBytes / 1073741824).toFixed(1)}GB). Gemini accepts up to 2GB per video.` }, 400);
  }

  try {
    const res = await fetch(`${GEMINI}/upload/v1beta/files`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(numBytes),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("Gemini upload-session error:", res.status, t);
      return json({ error: `Gemini upload-session ${res.status}: ${t.slice(0, 200)}` }, res.status);
    }

    const uploadUrl = res.headers.get("x-goog-upload-url");
    if (!uploadUrl) return json({ error: "No upload URL in Gemini response" }, 500);

    // Google rejects any non-final chunk that isn't a multiple of this (8MB at
    // time of writing). Pass it through rather than hardcoding, so a change on
    // their side doesn't silently break uploads.
    const granularity = Number(res.headers.get("x-goog-upload-chunk-granularity")) || 8 * 1024 * 1024;

    return json({ uploadUrl, granularity });
  } catch (e) {
    console.error("upload-url error:", e);
    return json({ error: e.message || "Unknown error" }, 500);
  }
}
