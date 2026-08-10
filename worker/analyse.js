// POST /api/analyse
//
// Receives only tiny file REFERENCES (videos were already streamed to Gemini via
// /api/upload), waits for each to finish processing, then asks Gemini 2.5 Pro to
// adjudicate. Raw fetch against the Gemini REST API — no Node SDK, Workers-native.

const GEMINI = "https://generativelanguage.googleapis.com";
const MODEL = "gemini-2.5-pro";

// Best-effort in-memory rate limit (advisory only — see note in upload.js).
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

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

// Poll the Files API until the video is ACTIVE (processing takes a few seconds).
async function waitForActive(apiKey, name, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const r = await fetch(`${GEMINI}/v1beta/${name}`, { headers: { "x-goog-api-key": apiKey } });
    const f = await r.json();
    if (f.state === "ACTIVE") return f;
    if (f.state === "FAILED") throw new Error(`File processing failed: ${name}`);
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("Timeout waiting for file to become ACTIVE");
}

export async function handleAnalyse(request, env) {
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

  const { systemPrompt, userPrompt, files } = body || {};
  if (!systemPrompt || !userPrompt || !Array.isArray(files) || files.length === 0) {
    return json({ error: "Missing systemPrompt, userPrompt, or files array" }, 400);
  }

  try {
    console.log(`Waiting for ${files.length} file(s) to be ACTIVE…`);
    const activeFiles = [];
    for (const f of files) {
      const active = await waitForActive(apiKey, f.name);
      activeFiles.push({ uri: active.uri, mimeType: active.mimeType });
    }
    console.log("All files ACTIVE. Calling generateContent…");

    const parts = [{ text: userPrompt }];
    activeFiles.forEach((f, i) => {
      parts.push({ text: `\n═══ ${activeFiles.length > 1 ? `ANGLE ${i + 1}` : "MAIN VIEW"} ═══` });
      parts.push({ fileData: { fileUri: f.uri, mimeType: f.mimeType } });
    });

    const genRes = await fetch(`${GEMINI}/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8000,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await genRes.json();

    if (!genRes.ok) {
      const msg = data?.error?.message || JSON.stringify(data).slice(0, 300);
      console.error("Gemini generateContent error:", genRes.status, msg);
      if (genRes.status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(msg)) {
        return json({ error: "Gemini quota exceeded. Check billing." }, 429);
      }
      return json({ error: `Gemini: ${msg}` }, genRes.status);
    }

    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");

    // Clean up uploaded files (they auto-expire after 48h anyway).
    for (const f of files) {
      try {
        await fetch(`${GEMINI}/v1beta/${f.name}`, { method: "DELETE", headers: { "x-goog-api-key": apiKey } });
      } catch { /* ignore */ }
    }

    if (!text) {
      console.error("Empty Gemini response:", JSON.stringify(data).slice(0, 500));
      return json({ error: "Gemini returned empty response" }, 500);
    }
    console.log("Gemini response length:", text.length);
    return json({ text });
  } catch (e) {
    console.error("Gemini analyse error:", e);
    return json({ error: `Gemini: ${(e.message || "Unknown error").slice(0, 300)}` }, 500);
  }
}
