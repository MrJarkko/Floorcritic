// Vercel serverless function — /api/analyse
// Uses Gemini 2.5 Pro with files pre-uploaded to Gemini Files API.
// Video bytes never hit Vercel — they go browser → Gemini directly.

import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 300, // 5min — needs Vercel Pro for full heats. Hobby = 60s.
};

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

// Poll Gemini Files API until file is ACTIVE (videos take a few seconds to process)
async function waitForActive(ai, fileName, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const file = await ai.files.get({ name: fileName });
    if (file.state === "ACTIVE") return file;
    if (file.state === "FAILED") throw new Error(`File processing failed: ${file.name}`);
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error("Timeout waiting for file to become ACTIVE");
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

  const { systemPrompt, userPrompt, files } = req.body || {};
  if (!systemPrompt || !userPrompt || !Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: "Missing systemPrompt, userPrompt, or files array" });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Wait for each file to become ACTIVE (videos need server-side processing)
    console.log(`Waiting for ${files.length} file(s) to be ACTIVE…`);
    const activeFiles = [];
    for (const f of files) {
      const active = await waitForActive(ai, f.name);
      activeFiles.push({ ...f, uri: active.uri, mimeType: active.mimeType });
    }
    console.log("All files ACTIVE. Calling generateContent…");

    const parts = [{ text: userPrompt }];
    for (let i = 0; i < activeFiles.length; i++) {
      const f = activeFiles[i];
      parts.push({ text: `\n═══ ${activeFiles.length > 1 ? `ANGLE ${i + 1}` : "MAIN VIEW"} ═══` });
      parts.push({ fileData: { fileUri: f.uri, mimeType: f.mimeType } });
    }

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

    // Clean up uploaded files (optional — they auto-expire after 48h)
    for (const f of files) {
      try { await ai.files.delete({ name: f.name }); } catch { /* ignore */ }
    }

    res.status(200).json({ text });
  } catch (e) {
    console.error("Gemini analyse error:", e);
    const msg = e.message || "Unknown error";
    if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      res.status(429).json({ error: "Gemini quota exceeded. Check billing." });
    } else if (msg.includes("SAFETY")) {
      res.status(400).json({ error: "Video blocked by safety filters." });
    } else {
      res.status(500).json({ error: `Gemini: ${msg.slice(0, 300)}` });
    }
  }
}
