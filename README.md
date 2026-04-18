# FloorCritic

AI-powered WDSF ballroom dance competition analysis. Upload your video, get ranked feedback against WDSF judging criteria.

## Features

- 🎬 **Any video format** — HEVC/H.265 from iPhone auto-converted via ffmpeg.wasm
- 💃 **Standard & Latin** — all 10 WDSF dances covered
- 📊 **Objective ranking** — couples ranked on 6 WDSF criteria
- ⭐ **Optional "my couple" focus** — pin yourself for focused feedback
- 🔒 **Secure** — Anthropic API key stays server-side

## Deploy to Vercel (10 minutes)

### Step 1 — Get an Anthropic API key

1. Go to https://console.anthropic.com
2. Create an account, add a payment method (costs ~$0.05 per analysis)
3. API Keys → Create Key → copy the `sk-ant-...` value

### Step 2 — Push to GitHub

```bash
cd floorcritic
git init
git add .
git commit -m "Initial commit"
# Create a new repo at github.com/new, then:
git remote add origin https://github.com/YOUR_USERNAME/floorcritic.git
git push -u origin main
```

### Step 3 — Deploy on Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Framework: **Vite** (auto-detected)
4. **Environment Variables** → add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your key)
5. Click **Deploy**

~2 minutes later you'll have a live URL like `floorcritic.vercel.app`.

### Step 4 — Install on iPhone

1. Open the Vercel URL in Safari on your iPhone
2. Share button → "Add to Home Screen"
3. Launches fullscreen like a native app

## Local Development

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

Visit http://localhost:5173

**Note:** For local dev, you need Vercel CLI to run serverless functions locally:

```bash
npm i -g vercel
vercel dev
```

## How It Works

```
1. User uploads video (any format, any device)
2. App tries native browser frame extraction (fast path for H.264)
3. If that fails (HEVC), ffmpeg.wasm transcodes in-browser
4. 6 keyframes extracted as JPEGs
5. Sent to /api/analyse (Vercel serverless function)
6. Function proxies to Anthropic API with secret key
7. Claude Opus analyses against WDSF criteria
8. Structured JSON returned, rendered as scorecard
```

## Cost per Analysis

~$0.05 USD per video analysis (Claude Opus vision pricing). 20 analyses ≈ $1.

## Limitations

- Max ~500MB video file (browser memory)
- Max 5 minutes of footage recommended
- Camera must have couples visible (wide-angle floor shot ideal)
- AI analysis, not official WDSF adjudication
