// POST /api/upload
//
// Streams a video from the browser straight to the Gemini Files API and returns
// a tiny file reference. Bytes pass THROUGH this Worker but are never buffered —
// FixedLengthStream pipes them — and GEMINI_API_KEY never reaches the client.
// Because only references (not bytes) ride in JSON bodies afterwards, request
// body limits stop mattering; this is what fixed the original 413.

const GEMINI = "https://generativelanguage.googleapis.com";
const MAX_BYTES = 100 * 1024 * 1024;

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

export async function handleUpload(request, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: "Missing GEMINI_API_KEY" }, 500);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.ok) return json({ error: rl.reason }, 429);

  const mimeType = request.headers.get("x-goog-upload-header-content-type") || "video/mp4";
  const numBytes = Number(request.headers.get("x-goog-upload-header-content-length") || 0);
  const displayName = request.headers.get("x-display-name") || "video";

  if (!numBytes) return json({ error: "Missing content length header" }, 400);
  if (numBytes > MAX_BYTES) return json({ error: "File too large (max 100MB per video)" }, 400);
  if (!request.body) return json({ error: "Empty request body" }, 400);

  try {
    // 1) Start a resumable upload session (key stays server-side).
    const startRes = await fetch(`${GEMINI}/upload/v1beta/files`, {
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

    if (!startRes.ok) {
      const t = await startRes.text();
      console.error("Gemini upload-session error:", startRes.status, t);
      return json({ error: `Gemini upload-session ${startRes.status}: ${t.slice(0, 200)}` }, startRes.status);
    }

    const uploadUrl = startRes.headers.get("x-goog-upload-url");
    if (!uploadUrl) return json({ error: "No upload URL from Gemini" }, 500);

    // 2) Stream the incoming body straight to Gemini with a known length.
    const { readable, writable } = new FixedLengthStream(numBytes);
    request.body.pipeTo(writable); // runs concurrently with the fetch below

    const upRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
        "Content-Type": mimeType,
      },
      body: readable,
    });

    if (!upRes.ok) {
      const t = await upRes.text();
      console.error("Gemini upload error:", upRes.status, t);
      return json({ error: `Gemini upload ${upRes.status}: ${t.slice(0, 200)}` }, upRes.status);
    }

    const data = await upRes.json();
    const file = data.file || data;
    return json({ name: file.name, uri: file.uri, mimeType: file.mimeType, state: file.state });
  } catch (e) {
    console.error("upload error:", e);
    return json({ error: e.message || "Unknown upload error" }, 500);
  }
}
