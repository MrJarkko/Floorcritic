# FloorCritic

AI-powered WDSF ballroom dance competition analysis. Upload your video (with audio!) and get professional-level ranked feedback — powered by Gemini 2.5 Pro's native video understanding.

## Why Gemini 2.5 Pro?

Unlike frame-sampling approaches, FloorCritic uses Gemini's native video API which:

- Processes full video files with audio up to 90MB
- Actually hears the music — real musicality analysis, not guessed
- Understands motion quality (rise-and-fall, hip action, CBM) not just poses
- Evaluates whether dancers are on the beat across the whole performance

## Deploy to Vercel

### Step 1 — Get a Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with Google
3. Click "Create API key" → copy it

Gemini 2.5 Pro requires billing enabled. Cost: ~$0.05-$0.15 per 1:30 analysis.

### Step 2 — Deploy on Vercel

1. Push project to GitHub
2. https://vercel.com/new → import repo
3. Framework: Vite (auto-detected)
4. Environment Variables → add `GEMINI_API_KEY` = your key
5. Deploy

### ⚠️ Vercel Pro recommended

Video analysis takes 30-90s. Hobby tier caps at 60s. For full-length heats, upgrade to Pro ($20/mo) or keep videos under ~45 seconds.

## Video Tips

- Wide-angle showing the whole floor
- Camera 10m+ back so bib numbers are readable
- Film from the long side of the floor
- 4K preferred, MP4 or MOV both fine
- Keep under 2 minutes for best cost/quality
- Multi-angle: one long-side, one short-side, one corner

## Local Dev

```bash
npm install
echo "GEMINI_API_KEY=your-key" > .env.local
npm i -g vercel
vercel dev
```

## Disclaimer

AI-assisted training aid, not official WDSF adjudication.
