// Vercel serverless function — /api/analyse
// Proxies the Anthropic API call so the API key stays on the server.
// Set ANTHROPIC_API_KEY as an environment variable in Vercel project settings.

export const config = {
  maxDuration: 60, // seconds — needed because vision calls can take ~30s
};

// ─── Simple in-memory rate limiting ───
// For serious production use, replace this with Upstash Redis or Vercel KV.
// Limits: 5 analyses per IP per hour, 50 per day globally.
const ipBuckets = new Map(); // ip → { count, resetAt }
const GLOBAL_LIMIT = { count: 0, resetAt: Date.now() + 24 * 3600_000, max: 50 };
const IP_WINDOW_MS = 3600_000; // 1 hour
const IP_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();

  // Global daily cap (protects your wallet)
  if (now > GLOBAL_LIMIT.resetAt) {
    GLOBAL_LIMIT.count = 0;
    GLOBAL_LIMIT.resetAt = now + 24 * 3600_000;
  }
  if (GLOBAL_LIMIT.count >= GLOBAL_LIMIT.max) {
    return { ok: false, reason: "Daily capacity reached — try again tomorrow." };
  }

  // Per-IP hourly cap
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
  } else {
    if (bucket.count >= IP_MAX) {
      const mins = Math.ceil((bucket.resetAt - now) / 60000);
      return { ok: false, reason: `Rate limit: ${IP_MAX} analyses per hour. Try again in ${mins} minutes.` };
    }
    bucket.count++;
  }

  GLOBAL_LIMIT.count++;
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server not configured (missing ANTHROPIC_API_KEY)" });
    return;
  }

  // Rate limit check
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    res.status(429).json({ error: rl.reason });
    return;
  }

  const { systemPrompt, userContent } = req.body || {};
  if (!systemPrompt || !userContent) {
    res.status(400).json({ error: "Missing systemPrompt or userContent" });
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: "user", content: userContent },
          { role: "assistant", content: "{" },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      res.status(response.status).json({ error: `Anthropic API ${response.status}: ${errText.slice(0, 300)}` });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    console.error("Proxy error:", e);
    res.status(500).json({ error: e.message || "Unknown server error" });
  }
}
