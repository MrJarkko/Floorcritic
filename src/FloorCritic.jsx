import { useState, useRef, useCallback } from "react";

const DANCES = {
  Standard: ["Waltz", "Tango", "Viennese Waltz", "Foxtrot", "Quickstep"],
  Latin: ["Cha Cha", "Samba", "Rumba", "Paso Doble", "Jive"],
};

const WDSF_CRITERIA = {
  Standard: ["Technique & Footwork", "Posture & Hold", "Timing & Musicality", "Floor Craft", "Presentation & Expression", "Partnership & Synchronisation"],
  Latin: ["Technique & Hip Action", "Arm Styling & Lines", "Timing & Musicality", "Floor Craft", "Presentation & Expression", "Partnership & Synchronisation"],
};

const COUPLE_COLORS = [
  "#E8C547", "#E85D47", "#47B5E8", "#7BE847", "#E847B5",
  "#47E8C5", "#E88947", "#9B47E8",
];

function ScoreBar({ score, max = 10 }) {
  const pct = (score / max) * 100;
  const color = score >= 8 ? "#7BE847" : score >= 6 ? "#E8C547" : "#E85D47";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 1s ease" }} />
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color, minWidth: 28 }}>{score.toFixed(1)}</span>
    </div>
  );
}

function CoupleCard({ couple, rank, color, expanded, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        background: expanded ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${expanded ? color : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: "#0a0a0f", flexShrink: 0,
        }}>
          {rank}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#f0ece0" }}>
              Couple #{couple.number}
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.4)", letterSpacing: 1 }}>
              {couple.nation || ""}
            </span>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.5)", marginTop: 2 }}>
            Overall: {couple.overall?.toFixed(1) ?? "—"} / 10
          </div>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.4)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</div>
      </div>

      {expanded && couple.scores && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gap: 10 }}>
            {Object.entries(couple.scores).map(([criterion, score]) => (
              <div key={criterion}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.45)", letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" }}>
                  {criterion}
                </div>
                <ScoreBar score={score} />
              </div>
            ))}
          </div>

          {couple.positives?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#7BE847", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>✦ Strengths</div>
              {couple.positives.map((p, i) => (
                <div key={i} style={{ fontFamily: "'Lora', serif", fontSize: 13, color: "rgba(240,236,224,0.75)", lineHeight: 1.6, marginBottom: 4, paddingLeft: 12, borderLeft: "2px solid rgba(123,232,71,0.3)" }}>{p}</div>
              ))}
            </div>
          )}

          {couple.faults?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#E85D47", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>✦ Areas to Improve</div>
              {couple.faults.map((f, i) => (
                <div key={i} style={{ fontFamily: "'Lora', serif", fontSize: 13, color: "rgba(240,236,224,0.75)", lineHeight: 1.6, marginBottom: 4, paddingLeft: 12, borderLeft: "2px solid rgba(232,93,71,0.3)" }}>{f}</div>
              ))}
            </div>
          )}

          {couple.summary && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
              <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13, color: "rgba(240,236,224,0.65)", lineHeight: 1.7 }}>{couple.summary}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FloorCritic() {
  const [step, setStep] = useState("setup"); // setup | uploading | analysing | results
  const [danceStyle, setDanceStyle] = useState("Standard");
  const [dance, setDance] = useState("Waltz");
  const [numCouples, setNumCouples] = useState(6);
  const [myCouple, setMyCouple] = useState(null);
  const [competition, setCompetition] = useState("");
  const [round, setRound] = useState("Heat");
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [results, setResults] = useState(null);
  const [expandedCouple, setExpandedCouple] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [ffmpegStatus, setFfmpegStatus] = useState("idle"); // idle | loading | ready
  const ffmpegRef = useRef(null);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setVideoFile(f);
    setVideoUrl(URL.createObjectURL(f));
  };

  // ─── FFmpeg.wasm loader (proper npm imports, works on any domain) ───
  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setFfmpegStatus("loading");
    setProgress("Loading video converter (~25MB, one-time)…");

    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress: p }) => {
        if (p > 0 && p <= 1) setProgress(`Converting video… ${Math.round(p * 100)}%`);
      });

      // Core files must be served same-origin or from cross-origin-isolated CDN
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      ffmpegRef.current = { ffmpeg, fetchFile };
      setFfmpegStatus("ready");
      return ffmpegRef.current;
    } catch (e) {
      console.error("FFmpeg load failed:", e);
      setFfmpegStatus("idle");
      throw new Error("Failed to load video converter: " + e.message);
    }
  }, []);

  // ─── Extract frames via ffmpeg.wasm (handles HEVC / all formats) ───
  const extractFramesFFmpeg = useCallback(async (file, count = 6) => {
    setProgress("Converting video (HEVC → JPEG frames)…");
    const { ffmpeg, fetchFile } = await loadFFmpeg();

    const inputName = "input" + (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".mov");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // First: probe duration by transcoding briefly, or estimate from metadata
    // Simpler: extract `count` evenly-spaced frames using fps filter based on duration
    // We'll use a two-step approach: probe, then extract

    // Step 1: extract frames at evenly spaced intervals
    // -vf "fps=N/duration" would need duration probing; instead use a trick:
    // Extract 1 frame per (total_frames / count) using select filter
    // Simplest: use -vf thumbnail and -vframes count
    setProgress("Extracting frames…");

    // Use scale filter to keep files small + select evenly
    // We'll extract `count` frames using select='not(mod(n, N/count))' — but we don't know N
    // Easiest reliable approach: use -ss seeks for each frame position after probing duration

    // Probe duration via a quick ffprobe-ish call
    let duration = 0;
    ffmpeg.on("log", ({ message }) => {
      const m = message.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      if (m) duration = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
    });
    try {
      await ffmpeg.exec(["-i", inputName, "-f", "null", "-"]);
    } catch { /* exit code non-zero is expected here */ }

    if (!duration || duration < 1) {
      throw new Error("Could not determine video duration.");
    }
    console.log("FFmpeg probed duration:", duration, "s");

    // Step 2: extract each frame via -ss seek
    const frames = [];
    for (let i = 0; i < count; i++) {
      const t = (duration / (count + 1)) * (i + 1);
      setProgress(`Extracting frame ${i + 1} of ${count}…`);
      const outName = `frame_${i}.jpg`;
      await ffmpeg.exec([
        "-ss", t.toFixed(2),
        "-i", inputName,
        "-frames:v", "1",
        "-vf", "scale=512:-2",
        "-q:v", "5",
        outName,
      ]);
      const data = await ffmpeg.readFile(outName);
      // Convert Uint8Array → base64
      let binary = "";
      const bytes = new Uint8Array(data);
      const chunk = 0x8000;
      for (let j = 0; j < bytes.length; j += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(j, j + chunk));
      }
      frames.push(btoa(binary));
      await ffmpeg.deleteFile(outName);
    }
    await ffmpeg.deleteFile(inputName);
    console.log(`FFmpeg extracted ${frames.length} frames`);
    return frames;
  }, [loadFFmpeg]);

  const extractFrames = useCallback(async (file, count = 8) => {
    return new Promise((resolve, reject) => {
      console.log("Starting frame extraction. File:", file.name, file.type, file.size, "bytes");
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      const frames = [];

      const cleanup = () => URL.revokeObjectURL(objectUrl);

      const timeout = setTimeout(() => {
        console.warn("Frame extraction timeout. Extracted:", frames.length);
        cleanup();
        if (frames.length >= 3) resolve(frames);
        else reject(new Error(`Timeout extracting frames (got ${frames.length}/${count}). File may be HEVC/H.265 which browsers can't decode. Try re-encoding to H.264 MP4.`));
      }, 45000);

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const w = video.videoWidth;
        const h = video.videoHeight;
        console.log("Metadata loaded. Duration:", duration, "Dimensions:", w, "x", h);

        if (!duration || !isFinite(duration)) {
          clearTimeout(timeout);
          cleanup();
          reject(new Error("Video duration is invalid. File may be corrupt or in an unsupported codec."));
          return;
        }
        if (!w || !h) {
          clearTimeout(timeout);
          cleanup();
          reject(new Error("Video has no visible dimensions — likely HEVC/H.265 codec that this browser can't decode. Re-encode to H.264 MP4 (any video editor / HandBrake / QuickTime 'Export As').") );
          return;
        }

        const times = Array.from({ length: count }, (_, i) => (duration / (count + 1)) * (i + 1));
        let idx = 0;
        const capture = () => {
          if (idx >= times.length) {
            clearTimeout(timeout);
            cleanup();
            resolve(frames);
            return;
          }
          video.currentTime = times[idx];
        };
        video.onseeked = () => {
          try {
            const canvas = document.createElement("canvas");
            const aspect = h / w;
            canvas.width = 512;
            canvas.height = Math.round(512 * aspect);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
            if (dataUrl === "data:," || dataUrl.length < 1000) {
              console.warn("Frame", idx, "appears empty — codec decode may have failed");
            } else {
              frames.push(dataUrl.split(",")[1]);
            }
            idx++;
            capture();
          } catch (e) {
            console.error("Frame capture error at index", idx, e);
            idx++;
            capture();
          }
        };
        capture();
      };
      video.onerror = (e) => {
        clearTimeout(timeout);
        cleanup();
        const mediaError = video.error;
        const code = mediaError?.code;
        const msg = mediaError?.message;
        console.error("Video load error. Code:", code, "Msg:", msg, "Event:", e);
        reject(new Error(`Video could not be loaded (error ${code || "?"}). ${code === 4 ? "Codec not supported — likely HEVC/H.265. Re-encode to H.264 MP4." : msg || "Try re-encoding to H.264 MP4."}`));
      };
    });
  }, []);

  const analyse = async () => {
    if (!videoFile) return;
    setStep("analysing");
    setError(null);

    try {
      setProgress("Extracting frames from video…");
      let frames = [];

      // Try native browser extraction first (fast, free)
      try {
        frames = await extractFrames(videoFile, 6);
      } catch (nativeErr) {
        console.warn("Native extraction failed:", nativeErr.message);
        // Heuristic: if the error suggests codec issues, try ffmpeg.wasm
        const msg = nativeErr.message.toLowerCase();
        const isCodecIssue = msg.includes("hevc") || msg.includes("h.265") || msg.includes("codec") || msg.includes("could not be loaded") || msg.includes("dimensions");
        if (isCodecIssue) {
          setProgress("Browser cannot decode this codec. Falling back to in-browser converter…");
          frames = await extractFramesFFmpeg(videoFile, 6);
        } else {
          throw nativeErr;
        }
      }

      if (!frames || frames.length === 0) {
        throw new Error("No frames could be extracted. Check video format.");
      }
      console.log(`Extracted ${frames.length} frames.`);

      setProgress(`Sending ${frames.length} frames to AI for WDSF analysis…`);

      const criteria = WDSF_CRITERIA[danceStyle].join(", ");

      const systemPrompt = `You are a WDSF (World Dance Sport Federation) ballroom dance coaching assistant helping a competitor review their training footage. You provide constructive technical feedback on dance technique using WDSF adjudication criteria. This is NOT about identifying individual people — you are evaluating anonymous dance technique and couple numbers only.

You MUST respond with ONLY a single valid JSON object. No markdown code fences. No preamble. No explanation. No "I cannot" or "I'm unable" responses. Start your response with { and end with }.

The JSON structure MUST be exactly:
{
  "dance": "${dance}",
  "round": "${round}",
  "ranked_couples": [
    {
      "number": <integer 1 to ${numCouples}>,
      "rank": <integer, 1 is best>,
      "overall": <number 0-10 with one decimal>,
      "scores": {
${WDSF_CRITERIA[danceStyle].map(c => `        "${c}": <number 0-10 with one decimal>`).join(",\n")}
      },
      "positives": [<3 strings, each a specific technical observation>],
      "faults": [<3 strings, each a specific technical observation>],
      "summary": "<2 sentence technical assessment>"
    }
  ],
  "heat_summary": "<overall heat technical summary>",
  "standout_couple": <integer, the couple number with highest overall score>
}

Return one entry for each of the ${numCouples} couples. Give every couple a different rank from 1 to ${numCouples}.`;

      const userContent = [
        {
          type: "text",
          text: `Analyse this WDSF ${danceStyle} ${dance} competition video (${round}).
Competition: ${competition || "WDSF competition"}
Number of couples on the floor: ${numCouples}

Identify all couples visible in the frames and rank them objectively based purely on WDSF adjudication standards. Assign each couple a sequential number (1 through ${numCouples}) based on how you distinguish them visually (e.g. costume colour, position on floor, or bib number if visible).

WDSF judging criteria to assess: ${criteria}

Apply WDSF rules strictly and objectively. Evaluate technique, timing, musicality, floor craft, presentation, and partnership for every couple. Be specific and honest — this is for competitive analysis.`
        },
        ...frames.map(b64 => ({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: b64 }
        }))
      ];

      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userContent,
        })
      });

      if (!response.ok) {
        let errMsg = `API ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.error) errMsg = errJson.error;
        } catch {
          const errText = await response.text();
          errMsg = `API ${response.status}: ${errText.slice(0, 200)}`;
        }
        console.error("API error:", errMsg);
        throw new Error(errMsg);
      }
      const data = await response.json();
      console.log("API response:", data);

      // Prefix with { since we prefilled it
      const text = "{" + data.content.map(b => b.text || "").join("");
      console.log("Model text output:", text);

      // Try to extract JSON object even if model added preamble/fences
      let parsed;
      try {
        const clean = text.replace(/```json|```/gi, "").trim();
        parsed = JSON.parse(clean);
      } catch (firstErr) {
        // Fallback: find first { and last } and try parsing substring
        const first = text.indexOf("{");
        const last = text.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
          try {
            parsed = JSON.parse(text.slice(first, last + 1));
          } catch (secondErr) {
            console.error("JSON parse failed. Raw output:", text);
            throw new Error("Model returned invalid JSON. Check console for raw output.");
          }
        } else {
          console.error("No JSON found in response:", text);
          throw new Error("Model response did not contain JSON. Try a clearer video or fewer couples.");
        }
      }

      if (!parsed.ranked_couples || !Array.isArray(parsed.ranked_couples)) {
        console.error("Unexpected shape:", parsed);
        throw new Error("Analysis response missing couples data. Try again with a clearer video.");
      }

      // Attach colours
      parsed.ranked_couples = parsed.ranked_couples.map((c, i) => ({
        ...c,
        color: COUPLE_COLORS[i % COUPLE_COLORS.length]
      }));

      setResults(parsed);
      const defaultExpand = myCouple != null ? myCouple : (parsed.ranked_couples.find(c => c.rank === 1)?.number ?? null);
      setExpandedCouple(defaultExpand);
      setStep("results");
    } catch (e) {
      console.error(e);
      setError(e.message || "Analysis failed. Please try again.");
      setStep("setup");
    }
  };

  const myResult = myCouple != null ? results?.ranked_couples?.find(c => c.number === myCouple) : null;

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const bg = { minHeight: "100vh", background: "#0a0a0f", color: "#f0ece0", fontFamily: "'Lora', serif", padding: "0 0 60px" };
  const container = { maxWidth: 720, margin: "0 auto", padding: "0 20px" };

  return (
    <div style={bg}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input[type=range] { -webkit-appearance: none; width: 100%; height: 4px; background: rgba(255,255,255,0.12); border-radius: 2px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #E8C547; cursor: pointer; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "28px 0 24px" }}>
        <div style={container}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#f0ece0" }}>
              Floor<span style={{ color: "#E8C547" }}>Critic</span>
            </h1>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.3)", letterSpacing: 2, textTransform: "uppercase" }}>WDSF Analysis</span>
          </div>
          <p style={{ margin: "6px 0 0", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.35)", letterSpacing: 0.5 }}>
            AI-powered adjudication · Standard & Latin · Competitor Edition
          </p>
        </div>
      </div>

      <div style={container}>

        {/* ── SETUP ── */}
        {(step === "setup") && (
          <div style={{ animation: "fadeUp 0.5s ease forwards", paddingTop: 36 }}>

            {error && (
              <div style={{ background: "rgba(232,93,71,0.12)", border: "1px solid rgba(232,93,71,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#E85D47" }}>
                ⚠ {error}
              </div>
            )}

            {/* Competition Info */}
            <section style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#E8C547", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>01 — Competition Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.4)", display: "block", marginBottom: 6 }}>Competition Name</label>
                  <input value={competition} onChange={e => setCompetition(e.target.value)}
                    placeholder="e.g. WDSF Open Berlin"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px", color: "#f0ece0", fontFamily: "'Lora', serif", fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.4)", display: "block", marginBottom: 6 }}>Round</label>
                  <select value={round} onChange={e => setRound(e.target.value)}
                    style={{ width: "100%", background: "#141420", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px", color: "#f0ece0", fontFamily: "'DM Mono', monospace", fontSize: 12, outline: "none" }}>
                    {["Heat", "1st Round", "2nd Round", "Quarter-Final", "Semi-Final", "Final"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Dance Selection */}
            <section style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#E8C547", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>02 — Dance</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {["Standard", "Latin"].map(s => (
                  <button key={s} onClick={() => { setDanceStyle(s); setDance(DANCES[s][0]); }}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${danceStyle === s ? "#E8C547" : "rgba(255,255,255,0.1)"}`, background: danceStyle === s ? "rgba(232,197,71,0.1)" : "transparent", color: danceStyle === s ? "#E8C547" : "rgba(240,236,224,0.5)", fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DANCES[danceStyle].map(d => (
                  <button key={d} onClick={() => setDance(d)}
                    style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${dance === d ? "#E8C547" : "rgba(255,255,255,0.08)"}`, background: dance === d ? "rgba(232,197,71,0.1)" : "transparent", color: dance === d ? "#E8C547" : "rgba(240,236,224,0.45)", fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}>
                    {d}
                  </button>
                ))}
              </div>
            </section>

            {/* Couples */}
            <section style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#E8C547", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>03 — Couples on the Floor</div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.5)" }}>Number of couples</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#f0ece0" }}>{numCouples}</span>
                </div>
                <input type="range" min={2} max={10} value={numCouples} onChange={e => { setNumCouples(+e.target.value); if (myCouple > +e.target.value) setMyCouple(null); }} />
              </div>

              {/* Optional: highlight my couple */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: myCouple != null ? 14 : 0 }}>
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.6)" }}>Highlight my couple</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.25)", marginTop: 3 }}>Optional — pin a couple number for focused feedback</div>
                  </div>
                  <button
                    onClick={() => setMyCouple(myCouple != null ? null : 1)}
                    style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: myCouple != null ? "#E8C547" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#0a0a0f", position: "absolute", top: 3, left: myCouple != null ? 21 : 3, transition: "left 0.2s" }} />
                  </button>
                </div>
                {myCouple != null && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Array.from({ length: numCouples }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setMyCouple(n)}
                        style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${myCouple === n ? "#E8C547" : "rgba(255,255,255,0.1)"}`, background: myCouple === n ? "rgba(232,197,71,0.15)" : "transparent", color: myCouple === n ? "#E8C547" : "rgba(240,236,224,0.4)", fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Video Upload */}
            <section style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#E8C547", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>04 — Video</div>
              <div
                onClick={() => fileRef.current.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                style={{ border: `2px dashed ${videoFile ? "rgba(123,232,71,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: videoFile ? "rgba(123,232,71,0.03)" : "transparent" }}>
                <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                {videoFile ? (
                  <>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#7BE847", marginBottom: 4 }}>✓ Video loaded</div>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: 14, color: "rgba(240,236,224,0.6)" }}>{videoFile.name}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.3)", marginTop: 4 }}>
                      {(videoFile.size / 1e6).toFixed(1)} MB · Click to change
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🎬</div>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: 14, color: "rgba(240,236,224,0.5)" }}>Drop your competition video here</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.25)", marginTop: 6 }}>or click to browse · MP4, MOV, AVI</div>
                  </>
                )}
              </div>
              {videoUrl && (
                <video src={videoUrl} controls style={{ width: "100%", borderRadius: 10, marginTop: 12, maxHeight: 240, objectFit: "cover", background: "#000" }} />
              )}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(123,232,71,0.06)", border: "1px solid rgba(123,232,71,0.15)", borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.55)", lineHeight: 1.6 }}>
                ✓ <strong style={{ color: "#7BE847" }}>All formats supported.</strong> If your iPhone video uses HEVC/H.265, we'll auto-convert it in-browser on first use (one-time ~25MB download).
              </div>
            </section>

            <button
              onClick={analyse}
              disabled={!videoFile}
              style={{ width: "100%", padding: "16px", borderRadius: 10, border: "none", background: videoFile ? "#E8C547" : "rgba(255,255,255,0.05)", color: videoFile ? "#0a0a0f" : "rgba(255,255,255,0.2)", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, cursor: videoFile ? "pointer" : "not-allowed", letterSpacing: 0.5, transition: "all 0.2s" }}>
              Analyse with WDSF Standards →
            </button>
          </div>
        )}

        {/* ── ANALYSING ── */}
        {step === "analysing" && (
          <div style={{ textAlign: "center", paddingTop: 100, animation: "fadeUp 0.4s ease" }}>
            <div style={{ width: 56, height: 56, border: "3px solid rgba(232,197,71,0.15)", borderTopColor: "#E8C547", borderRadius: "50%", margin: "0 auto 28px", animation: "spin 1s linear infinite" }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#f0ece0", margin: "0 0 10px" }}>Analysing Performance</h2>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(240,236,224,0.4)", animation: "pulse 2s ease infinite" }}>{progress}</p>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13, color: "rgba(240,236,224,0.25)", marginTop: 16 }}>
              Applying WDSF {danceStyle} {dance} criteria…
            </p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {step === "results" && results && (
          <div style={{ animation: "fadeUp 0.5s ease", paddingTop: 32 }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#f0ece0" }}>
                  {competition || "Competition"} — {dance}
                </h2>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.35)", letterSpacing: 1 }}>{round} · {results.ranked_couples?.length} couples</span>
              </div>
              <button onClick={() => { setStep("setup"); setResults(null); setVideoFile(null); setVideoUrl(null); }}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(240,236,224,0.5)", fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>
                NEW ANALYSIS
              </button>
            </div>

            {/* Highlight block — my couple if set, otherwise AI's standout pick */}
            {(() => {
              const featured = myResult || (results.standout_couple != null ? results.ranked_couples.find(c => c.number === results.standout_couple) : null);
              const isMyCouple = !!myResult;
              if (!featured) return null;
              return (
                <div style={{ background: "linear-gradient(135deg, rgba(232,197,71,0.08), rgba(232,197,71,0.03))", border: "1px solid rgba(232,197,71,0.25)", borderRadius: 14, padding: "20px 22px", marginBottom: 28 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#E8C547", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                    {isMyCouple ? `Your Performance — Couple #${featured.number}` : `Standout Performance — Couple #${featured.number}`}
                  </div>
                  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: "#E8C547", lineHeight: 1 }}>#{featured.rank}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.35)", marginTop: 4 }}>RANKING</div>
                    </div>
                    <div style={{ width: 1, height: 50, background: "rgba(232,197,71,0.2)" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: "#E8C547", lineHeight: 1 }}>{featured.overall?.toFixed(1)}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.35)", marginTop: 4 }}>OVERALL / 10</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13, color: "rgba(240,236,224,0.6)", lineHeight: 1.6 }}>{featured.summary}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Heat summary */}
            {results.heat_summary && (
              <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13, color: "rgba(240,236,224,0.4)", marginBottom: 24, padding: "0 4px", lineHeight: 1.7 }}>
                "{results.heat_summary}"
              </div>
            )}

            {/* Ranked couples */}
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Full Rankings</div>
            {[...results.ranked_couples].sort((a, b) => a.rank - b.rank).map((couple) => (
              <CoupleCard
                key={couple.number}
                couple={couple}
                rank={couple.rank}
                color={myCouple === couple.number ? "#E8C547" : couple.color}
                expanded={expandedCouple === couple.number}
                onToggle={() => setExpandedCouple(expandedCouple === couple.number ? null : couple.number)}
              />
            ))}

            <div style={{ marginTop: 32, padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.25)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Note</div>
              <p style={{ margin: 0, fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 12, color: "rgba(240,236,224,0.3)", lineHeight: 1.7 }}>
                This analysis is AI-generated based on video frames and WDSF adjudication principles. It is intended as a training aid and does not constitute official adjudication. Results may vary based on video quality and camera angle.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
