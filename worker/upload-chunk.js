// POST /api/upload-chunk
//
// Forwards ONE slice of a video to an in-flight Gemini resumable upload session.
//
// Why chunks instead of one request? Cloudflare caps request bodies at 100MB on
// Free/Pro, which is smaller than a full competition heat. Gemini's resumable
// protocol accepts byte ranges at explicit offsets, so the browser slices the
// file and sends each piece separately — every request stays far under the cap
// while the total is bounded only by Gemini's 2GB per-file limit.
//
// Why not let the browser upload straight to Google and skip us entirely?
// Verified empirically: the OPTIONS preflight succeeds, but Google's response to
// the actual upload POST carries no Access-Control-Allow-Origin, so the browser
// blocks it. Proxying is the only workable route.
//
// The client supplies the session URL, so we MUST validate it before fetching —
// otherwise this endpoint is an open SSRF proxy.

const ALLOWED_UPLOAD_HOST = "generativelanguage.googleapis.com";
const MAX_CHUNK = 64 * 1024 * 1024; // generous ceiling; client uses 16MB

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function handleUploadChunk(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "Missing GEMINI_API_KEY" }, 500);

  const uploadUrl = request.headers.get("x-upload-url");
  const offset = request.headers.get("x-goog-upload-offset");
  const command = request.headers.get("x-goog-upload-command");
  const chunkLength = Number(request.headers.get("x-chunk-length") || 0);

  if (!uploadUrl || offset === null || !command) {
    return json({ error: "Missing x-upload-url, x-goog-upload-offset, or x-goog-upload-command" }, 400);
  }
  if (!chunkLength) return json({ error: "Missing x-chunk-length" }, 400);
  if (chunkLength > MAX_CHUNK) return json({ error: "Chunk too large" }, 400);
  if (!/^\d+$/.test(offset)) return json({ error: "Invalid offset" }, 400);
  if (command !== "upload" && command !== "upload, finalize") {
    return json({ error: "Invalid upload command" }, 400);
  }

  // SSRF guard: only ever forward to Gemini's upload host over HTTPS.
  let target;
  try {
    target = new URL(uploadUrl);
  } catch {
    return json({ error: "Malformed upload URL" }, 400);
  }
  if (target.protocol !== "https:" || target.hostname !== ALLOWED_UPLOAD_HOST) {
    return json({ error: "Upload URL not permitted" }, 400);
  }
  if (!request.body) return json({ error: "Empty chunk body" }, 400);

  try {
    // Stream the chunk through without buffering it in the isolate.
    const { readable, writable } = new FixedLengthStream(chunkLength);
    request.body.pipeTo(writable);

    const res = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "X-Goog-Upload-Offset": offset,
        "X-Goog-Upload-Command": command,
        "Content-Type": "application/octet-stream",
      },
      body: readable,
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Gemini chunk error:", res.status, text.slice(0, 300));
      return json({ error: `Gemini chunk ${res.status}: ${text.slice(0, 200)}` }, res.status);
    }

    // Intermediate chunks return an empty body; only the finalising one has JSON.
    if (command === "upload") return json({ ok: true });

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Unparseable finalize response:", text.slice(0, 300));
      return json({ error: "Gemini returned an unreadable upload response" }, 502);
    }
    const f = data.file || data;
    return json({ name: f.name, uri: f.uri, mimeType: f.mimeType, state: f.state });
  } catch (e) {
    console.error("upload-chunk error:", e);
    return json({ error: e.message || "Unknown chunk error" }, 500);
  }
}
