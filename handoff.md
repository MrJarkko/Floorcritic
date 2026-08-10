# FloorCritic — Development Handoff

## Project Summary

**What:** WDSF ballroom dance competition analysis web app. Users upload 1-3 videos of a competition heat, and the app returns an AI-generated scorecard with rankings, per-couple scores across 6 WDSF criteria, strengths/faults, and a heat summary.

**Target users:** Competitive ballroom dancers (self-analysis), coaches, dance studios.

**Live URL:** https://floorcritic.com (Cloudflare Workers; was floorcritic.vercel.app)
**Repo:** [your GitHub URL]
**Owner context:** Jarkko, competitive ballroom dancer based in Estonia. Also a cyber-security professional (day job — no relation to this project).

## Stack

- **Frontend:** React 18 + Vite, single-file component `src/FloorCritic.jsx`
- **Backend:** Cloudflare **Worker** (Static Assets model) — `worker/index.js` routes `/api/*`, serves `dist/` via the ASSETS binding
- **AI provider:** Google Gemini 2.5 Pro via raw REST `fetch` (no Node SDK — Workers-native)
- **Video transcoding:** `@ffmpeg/ffmpeg` (ffmpeg.wasm) for iPhone HEVC → H.264 conversion in-browser
- **Hosting:** Cloudflare Workers, free plan (100MB request body; no 4.5MB wall)

## Architecture (implemented, on Cloudflare Workers)

```
Browser (React, static assets served by the Worker)
  │
  │  ffmpeg.wasm transcodes HEVC → H.264 locally if needed
  │
  ├─→ POST /api/upload-url     → Worker (worker/upload-url.js)
  │     {displayName,mime,size}   └─→ opens a Gemini resumable upload session
  │     ←── { uploadUrl, granularity }
  │
  ├─→ POST /api/upload-chunk   → Worker (worker/upload-chunk.js)  [xN, 16MB each]
  │     one 16MB slice            ├─→ validates the URL host (SSRF guard)
  │     + offset + command        ├─→ streams the slice through (FixedLengthStream)
  │     ←── {} then, on the       └─→ Gemini assembles the file at the given offset
  │         final chunk,
  │         { name, uri, mimeType, state }
  │
  └─→ POST /api/analyse        → Worker (worker/analyse.js)
        {                          ├─→ polls each file until ACTIVE
          systemPrompt,            ├─→ gemini-2.5-pro generateContent with fileData refs
          userPrompt,              ├─→ deletes uploaded files afterwards
          files: [{name, mime}]    └─→ returns structured JSON analysis
        }
        ←── { text: "<JSON>" }
```

Video bytes are streamed through the Worker rather than sent browser→Google directly, so
`GEMINI_API_KEY` never reaches the client. Only tiny file *references* ride in JSON bodies,
so request-size limits are irrelevant — this is what fixed the original 413.

**Why chunked, and why not upload straight to Google?** Cloudflare caps any single request
body at 100MB (Free/Pro), which is smaller than a full heat. Uploading direct from the
browser would sidestep that, and the signed session URL needs no API key — but it does not
work: the CORS preflight succeeds while Google's response to the actual upload POST carries
no `Access-Control-Allow-Origin`, so the browser blocks it. Both were verified empirically
(headless Chrome, real requests). Chunking is therefore the route: each slice is ~16MB, and
the total is bounded only by Gemini's 2GB per-file limit.

Non-final chunks must be a multiple of the granularity Google reports in
`x-goog-upload-chunk-granularity` (8MB today); `/api/upload-url` passes it to the client
rather than hardcoding it. Because the client supplies the session URL back to
`/api/upload-chunk`, that endpoint validates the host before fetching — without it, it
would be an open SSRF proxy.

## Resolved Bug — "Body is disturbed or locked" / 413 (fixed 2026-08-10)

### Root cause
The two-step upload described in the old architecture **was never implemented in the
frontend**. `uploadFileToGemini()` and any call to `/api/upload-url` did not exist in
`src/FloorCritic.jsx`. `analyse()` base64-encoded the whole video (+33% size) and POSTed
it inline to `/api/analyse`, so a 28MB video became a ~37MB JSON body and Vercel's edge
rejected it with 413 before the function ran. `/api/upload-url` never appeared in the logs
because nothing ever called it. The Safari-cache / CORS / COOP-COEP theories were red herrings.

The `GET` in the Vercel logs was a platform artifact of the oversized-body rejection, not
a real request — the code always used POST.

### The masking bug
The error handler read the response body twice (`.json()` then `.text()` in the catch),
which throws *"Body is disturbed or locked"* and hid the real 413. It now reads the body
once as text and parses from that.

### Two further breaks found behind it
1. `api/analyse.js` expected `{files:[{name,mime}]}` but the frontend sent `{videos:[{mimeType,data}]}`.
2. `@google/genai` was imported but never installed → the function 500'd on load.
   Both functions now use raw `fetch` against the Gemini REST API, so the SDK is gone entirely.

### Verified
A 6,410,004-byte video (well past the old 4.5MB wall) streamed through `/api/upload` to the
Gemini Files API in ~5s and reached `ACTIVE`. Endpoints return correct 400s instead of crashing.

## Files to know

| File | Purpose |
|---|---|
| `src/FloorCritic.jsx` | Main React component. `uploadFileToGemini()` and `analyse()` carry `[analyse]` / `[uploadFileToGemini]` console breadcrumbs. |
| `worker/index.js` | Worker entry. Routes the three `/api/*` endpoints, serves `dist/` via ASSETS, stamps COOP/COEP. |
| `worker/upload-url.js` | Opens a Gemini resumable session; returns `{uploadUrl, granularity}`. |
| `worker/upload-chunk.js` | Forwards one slice at a byte offset. Host-validates the URL (SSRF guard). |
| `worker/analyse.js` | Takes `{systemPrompt, userPrompt, files}`, polls to ACTIVE, calls gemini-2.5-pro. |
| `wrangler.toml` | Worker config: `main`, `[assets] directory/binding`, `run_worker_first`. |
| `vite.config.js` | Same COOP/COEP headers for `vite` dev server. |
| `package.json` | Deps: react, @ffmpeg/ffmpeg, @ffmpeg/util. Dev: vite, wrangler. |

## Environment variables

Local development requires `.dev.vars` (gitignored, read by `wrangler pages dev`):
```
GEMINI_API_KEY=your_key_from_aistudio.google.com/apikey
```

Cloudflare needs the same as a **Secret** in the Worker → Settings → Variables and Secrets.

Local commands:
- `npm run dev` — Vite only (UI work; `/api/*` will 404)
- `npm run cf:dev` — build + `wrangler dev` (full stack, needs Node >= 22)

## Analysis quality (grounding against hallucination)

Gemini was inventing detail. The prompt was the cause, not the model: it demanded
`3-5 specific observations` of both strengths and faults per couple, six scores to one
decimal with no null option, and `Expected ~N couples. Each gets a unique rank from 1 to N`.
Competition video is shot from a distance with couples constantly blocked, so those
requirements can only be met by making things up.

The prompt now:
- requires every positive/fault to open with a `[M:SS]` timestamp of the moment observed —
  an unverifiable claim has nowhere to hide
- allows `null` per criterion, and `null` overall, when the footage does not support a score
- asks for 0-4 observations, with empty arrays explicitly correct
- tells the model to omit couples it cannot track, rather than padding to the expected count
- adds `evidence_quality` per couple (good/partial/poor) and a heat-level
  `footage_limitations`, both surfaced in the UI
- forbids naming facial expressions, footwork, or costume detail that isn't resolvable

Temperature dropped 0.3 -> 0.15. The UI renders `n/a` for null scores rather than implying
a zero, and says so plainly when a couple has no grounded observations.

## Thumbnails

Previously one frame was extracted per *video* and then assigned to couples by index
(`thumbnails[i % thumbnails.length]`), so with a single video every couple showed the
identical mid-heat wide shot — and `null` (nothing rendered) whenever extraction failed.

Now Gemini returns `best_frame_time` (seconds) per couple, plus an optional `box`
([ymin,xmin,ymax,xmax], 0-1000 normalised). After the analysis returns, the client seeks the
video to each couple's moment and crops to its box with 25% padding.

The extraction is deliberately defensive, because the original failure mode was total:
a single stalled seek blocked every remaining capture. Each seek now has its own timeout and
draws anyway if the `seeked` event never fires, so one bad frame costs one thumbnail.
Verified in Chrome (`--headless=new`) at 5/5 captured across time-seek, box-crop,
missing-time fallback, out-of-range clamp, and invalid-box cases. Note that OLD headless
Chrome cannot seek video at all (metadata loads, `seeked` never fires) — use `--headless=new`
if you ever re-test this.

## Product Roadmap (post-bug-fix)

Highest priority in rough order:

### Near-term (v0.2)
- **PDF export of scorecards** (share with coach)
- **Session history via localStorage** — track same couple across competitions
- **Timestamped observations** — "at 0:23, couple #47 was behind on beat 2"
- **Side-by-side compare mode** — same couple in two different heats
- **Better error recovery** — right now any error dumps back to setup with lost state

### Medium-term (v0.5)
- **Auth (Clerk or Supabase)** — persistent history per user
- **Video privacy controls** — blur faces of other dancers before upload
- **Coach dashboard** — see multiple students' progress
- **Rate-limit hardening** — in-memory Map is advisory only; Workers isolates don't share it. Needs Workers KV or Durable Objects.

### Long-term (v1.0)
- **Real-time / near-real-time analysis** — WebSocket + chunked upload for live coaching
- **Fine-tuned dance model** — only if we accumulate 5000+ user-annotated heats
- **B2B tier** — WDSF federations, dance studios

## Business context

- Product/AI wrapper competitive moat is thin — anyone could write a prompt for Gemini directly
- Value lives in: workflow friction removed, structured/comparable output, PDF export for coaches, session tracking
- Realistic pricing: free tier for competitors, €29/mo Pro for coaches, enterprise deal for federations
- Realistic scale target: €50-500k ARR range if executed well

## Design notes

- Color scheme: cream/gold on near-black. Serif display type (Playfair Display) + serif body (Lora) + mono (DM Mono) for labels.
- Mobile-first — most users will be on iPhone with a PWA add-to-homescreen
- Everything is one component right now (`FloorCritic.jsx`) — probably worth splitting when we add auth/history

## Constraints and known limitations

- **Cloudflare Workers free plan**: 100MB per request body (worked around by 16MB chunking; total upload size is unbounded by this). Workers CPU limit (10ms free) counts computation only — time awaiting Gemini is I/O and doesn't count. Very long heats could still hit client/connection timeouts; if that happens, move to an async job + polling pattern backed by Workers KV.
- **iPhone HEVC/H.265**: Safari can play these but `<canvas>.drawImage()` fails. We use ffmpeg.wasm to transcode when detected.
- **Gemini 2.5 Pro pricing**: ~$0.05-$0.15 per analysis. Rate limits: 5/hour/IP, 50/day global (advisory, in-memory).
- **iOS Safari upload** can be flaky for large files — needs testing on desktop Chrome before assuming it works everywhere.

## Next steps

1. Worker → Settings → Build: Build command `npm run build`, Deploy command `npx wrangler deploy`.
   There is no "output directory" field for Workers — `dist` comes from `[assets]` in wrangler.toml.
2. Worker → Settings → Variables and Secrets: `GEMINI_API_KEY` as a **Secret**.
3. Worker → Settings → Domains & Routes: add `floorcritic.com` + `www`.
4. **Run one real 60-90s competition heat end-to-end** — the full Gemini inference path has
   not yet been exercised with real footage, only the upload path.
5. Retire the Vercel project once the domain is live.
