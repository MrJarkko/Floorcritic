// Vercel serverless function — /api/analyse
// Uses Gemini 2.5 Pro for native video understanding (including audio/music).
// Set GEMINI_API_KEY as an environment variable in Vercel project settings.

import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 300, // 5min — video analysis takes 30-90s; needs Vercel Pro. Hobby caps at 60s.
  api: {
    bodyParser: {
      sizeLimit: "100mb", // video uploads
    },
  },
};

// ─── Rate limiting ───
const ipBuckets = new Map();
const GLOBAL_LIMIT = { count: 0, resetAt: Date.now() + 24 * 3600_000, max: 50 };
const IP_WINDOW_MS = 3600_000;
const IP_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  if (now > GLOBAL_LIMIT.resetAt) {
    GLOBAL_LIMIT.count = 0;
    GLOBAL_LIMIT.resetAt = now + 24 * 3600_000;
  }
  if (GLOBAL_LIMIT.count >= GLOBAL_LIMIT.max) {
    return { ok: false, reason: "Daily capacity reached — try again tomorrow." };
  }
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server not configured (missing GEMINI_API_KEY)" });
    return;
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    res.status(429).json({ error: rl.reason });
    return;
  }

  const { systemPrompt, userPrompt, videos } = req.body || {};
  if (!systemPrompt || !userPrompt || !Array.isArray(videos) || videos.length === 0) {
    res.status(400).json({ error: "Missing systemPrompt, userPrompt, or videos array" });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const parts = [{ text: userPrompt }];

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      if (!v.data || !v.mimeType) {
        res.status(400).json({ error: `Video ${i + 1} missing data or mimeType` });
        return;
      }
      parts.push({ text: `\n═══ ${videos.length > 1 ? `ANGLE ${i + 1}` : "MAIN VIEW"} ═══` });
      parts.push({
        inlineData: { mimeType: v.mimeType, data: v.data },
      });
    }

    console.log(`Gemini request: ${videos.length} video(s)`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 8000,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      console.error("Empty Gemini response:", response);
      res.status(500).json({ error: "Gemini returned empty response" });
      return;
    }
    console.log("Gemini response length:", text.length);

    res.status(200).json({ text });
  } catch (e) {
    console.error("Gemini API error:", e);
    const msg = e.message || "Unknown server error";
    if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      res.status(429).json({ error: "Gemini quota exceeded. Check your Google AI Studio billing." });
    } else if (msg.includes("SAFETY") || msg.includes("blocked")) {
      res.status(400).json({ error: "Video was blocked by safety filters. Try a different clip." });
    } else {
      res.status(500).json({ error: `Gemini: ${msg.slice(0, 300)}` });
    }
  }
}
