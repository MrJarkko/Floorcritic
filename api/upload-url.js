// Vercel serverless function — /api/upload-url
// Creates a time-limited Gemini Files API upload session and returns the upload URL.
// Browser then PUTs video bytes directly to that URL, bypassing Vercel's 4.5MB body limit.

export const config = {
  maxDuration: 30,
};

// Simple rate limit for upload-url requests
const ipBuckets = new Map();
const IP_WINDOW_MS = 3600_000;
const IP_MAX = 15; // 15 upload URLs per hour per IP (generous — covers retries)

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    return;
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    res.status(429).json({ error: rl.reason });
    return;
  }

  const { displayName, mimeType, numBytes } = req.body || {};
  if (!displayName || !mimeType || !numBytes) {
    res.status(400).json({ error: "Missing displayName, mimeType, or numBytes" });
    return;
  }

  // Reject unreasonably large uploads (Gemini Files API max is 2GB, but be conservative)
  if (numBytes > 500 * 1024 * 1024) {
    res.status(400).json({ error: "File too large (max 500MB)" });
    return;
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/upload/v1beta/files",
      {
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
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini upload-session error:", response.status, errText);
      res.status(response.status).json({ error: `Gemini upload-session ${response.status}: ${errText.slice(0, 200)}` });
      return;
    }

    const uploadUrl = response.headers.get("x-goog-upload-url");
    if (!uploadUrl) {
      res.status(500).json({ error: "No upload URL in response" });
      return;
    }

    res.status(200).json({ uploadUrl });
  } catch (e) {
    console.error("upload-url error:", e);
    res.status(500).json({ error: e.message || "Unknown error" });
  }
}
