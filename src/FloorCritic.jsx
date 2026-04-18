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
  const hasNumber = couple.number != null;
  const displayNumber = hasNumber ? `#${couple.number}` : "Unknown #";
  const confidenceDot = couple.number_confidence === "low" ? "🟡" : couple.number_confidence === "medium" ? "🟠" : "";

  return (
    <div
      onClick={onToggle}
      style={{
        background: expanded ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${expanded ? color : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Rank circle */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: "#0a0a0f", flexShrink: 0,
        }}>
          {rank}
        </div>

        {/* Thumbnail */}
        {couple.thumbnail ? (
          <div style={{
            width: 54, height: 54, borderRadius: 8, overflow: "hidden", flexShrink: 0,
            background: "#000", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <img
              src={`data:image/jpeg;base64,${couple.thumbnail}`}
              alt={`Couple ${couple.number ?? ""}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <div style={{
            width: 54, height: 54, borderRadius: 8, flexShrink: 0,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, opacity: 0.3,
          }}>💃</div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: hasNumber ? "#f0ece0" : "rgba(240,236,224,0.6)" }}>
              Couple {displayNumber} {confidenceDot}
            </span>
          </div>
          {couple.thumbnail_hint && (
            <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 11, color: "rgba(240,236,224,0.45)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {couple.thumbnail_hint}
            </div>
          )}
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.5)", marginTop: 2 }}>
            Overall: {couple.overall?.toFixed(1) ?? "—"} / 10
          </div>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.4)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>▼</div>
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
  const [myCoupleEnabled, setMyCoupleEnabled] = useState(false);
  const [myCouple, setMyCouple] = useState(null); // bib number the user wants tracked
  const [competition, setCompetition] = useState("");
  const [round, setRound] = useState("Heat");
  const [videos, setVideos] = useState([]); // array of { file, url, id }
  const [results, setResults] = useState(null);
  const [expandedCouple, setExpandedCouple] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [ffmpegStatus, setFfmpegStatus] = useState("idle");
  const ffmpegRef = useRef(null);
  const fileRef = useRef();

  const MAX_VIDEOS = 3;

  const handleFiles = (fileList) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).slice(0, MAX_VIDEOS - videos.length);
    const additions = newFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2, 9),
    }));
    setVideos(prev => [...prev, ...additions].slice(0, MAX_VIDEOS));
  };

  const removeVideo = (id) => {
    setVideos(prev => {
      const toRemove = prev.find(v => v.id === id);
      if (toRemove) URL.revokeObjectURL(toRemove.url);
      return prev.filter(v => v.id !== id);
    });
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
    if (videos.length === 0) return;
    setStep("analysing");
    setError(null);

    try {
      // Extract frames from every uploaded video
      const allFrames = []; // { videoIndex, angleLabel, b64 }
      const framesPerVideo = videos.length === 1 ? 8 : videos.length === 2 ? 5 : 4;

      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        const angleLabel = videos.length === 1 ? "Main view" : `Angle ${i + 1}`;
        setProgress(`Extracting frames from video ${i + 1} of ${videos.length}…`);

        let frames = [];
        try {
          frames = await extractFrames(v.file, framesPerVideo);
        } catch (nativeErr) {
          const msg = nativeErr.message.toLowerCase();
          const isCodecIssue = msg.includes("hevc") || msg.includes("h.265") || msg.includes("codec") || msg.includes("could not be loaded") || msg.includes("dimensions");
          if (isCodecIssue) {
            setProgress(`Converting video ${i + 1} (HEVC → JPEG)…`);
            frames = await extractFramesFFmpeg(v.file, framesPerVideo);
          } else {
            throw nativeErr;
          }
        }

        if (!frames || frames.length === 0) {
          throw new Error(`No frames extracted from video ${i + 1}. Check format.`);
        }
        frames.forEach(b64 => allFrames.push({ videoIndex: i, angleLabel, b64 }));
      }

      console.log(`Total frames extracted: ${allFrames.length} across ${videos.length} video(s)`);
      setProgress(`Sending ${allFrames.length} frames to AI for WDSF analysis…`);

      const criteria = WDSF_CRITERIA[danceStyle].join(", ");
      const multiVideo = videos.length > 1;

      const systemPrompt = `You are a WDSF (World Dance Sport Federation) ballroom dance coaching assistant analysing competition footage. You provide constructive technical feedback on dance technique using WDSF adjudication criteria.

${multiVideo ? `IMPORTANT: You are receiving frames from ${videos.length} DIFFERENT camera angles of the SAME heat/round. Synthesise observations across all angles for each couple — different angles reveal different technical details (footwork, posture, spacing). Frames are labelled with their angle.` : ""}

COUPLE IDENTIFICATION (CRITICAL):
- Each couple wears a BIB NUMBER pinned to the man's back (typically a large printed number).
- You MUST use the actual bib number you read from the man's back as the couple's "number" field.
- If you cannot clearly read the bib number for a couple, set "number" to null and explain in the couple's "summary" which couple you are referring to (e.g. "couple in red dress, left of frame").
- Do NOT make up numbers — only report what you can actually see.
- For the "thumbnail_hint" field, describe ONE identifying visual feature (e.g. "red dress, tall male partner") so the user knows which couple this is.

You MUST respond with ONLY a single valid JSON object. No markdown code fences. No preamble. No refusals. Start with { end with }.

JSON structure:
{
  "dance": "${dance}",
  "round": "${round}",
  "angles_analysed": ${videos.length},
  "ranked_couples": [
    {
      "number": <bib number integer from the male's back, or null if unreadable>,
      "number_confidence": <"high" | "medium" | "low">,
      "thumbnail_hint": "<short visual description to identify this couple, e.g. 'red dress, tall male'>",
      "rank": <integer, 1 is best>,
      "overall": <number 0-10 with one decimal>,
      "scores": {
${WDSF_CRITERIA[danceStyle].map(c => `        "${c}": <number 0-10 with one decimal>`).join(",\n")}
      },
      "positives": [<3 strings, specific technical observations>],
      "faults": [<3 strings, specific technical observations>],
      "summary": "<2 sentence technical assessment>"
    }
  ],
  "heat_summary": "<overall heat technical summary>",
  "standout_couple": <bib number of the couple that stood out most, or null>,
  "identification_notes": "<any notes about couples whose bib numbers could not be read>"
}

Return one entry per couple visible. Expected ~${numCouples} couples. Each couple gets a different rank (1 to N).`;

      // Build user content: intro text + interleaved angle labels + frames
      const userContent = [
        {
          type: "text",
          text: `Analyse this WDSF ${danceStyle} ${dance} competition footage (${round}).
Competition: ${competition || "WDSF competition"}
Expected number of couples: ~${numCouples}
Number of camera angles provided: ${videos.length}
${myCoupleEnabled && myCouple ? `\nUser is competing as bib #${myCouple} — please ensure this couple is included in your analysis if visible.` : ""}

${multiVideo ? "The following frames come from multiple camera angles of the same performance. Synthesise a single unified analysis using all angles.\n\n" : ""}Remember: identify each couple by the BIB NUMBER on the man's back — do not invent numbers.

WDSF criteria: ${criteria}

Be specific, objective and honest — this is for competitive analysis.`
        },
      ];

      // Interleave angle labels before each video's frames
      let currentAngle = -1;
      for (const frame of allFrames) {
        if (frame.videoIndex !== currentAngle) {
          userContent.push({ type: "text", text: `— ${frame.angleLabel} —` });
          currentAngle = frame.videoIndex;
        }
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: frame.b64 }
        });
      }

      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userContent })
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

      const text = "{" + data.content.map(b => b.text || "").join("");
      console.log("Model text output:", text);

      let parsed;
      try {
        const clean = text.replace(/```json|```/gi, "").trim();
        parsed = JSON.parse(clean);
      } catch (firstErr) {
        const first = text.indexOf("{");
        const last = text.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
          try { parsed = JSON.parse(text.slice(first, last + 1)); }
          catch { throw new Error("Model returned invalid JSON."); }
        } else {
          throw new Error("Model response did not contain JSON.");
        }
      }

      if (!parsed.ranked_couples || !Array.isArray(parsed.ranked_couples)) {
        throw new Error("Analysis response missing couples data.");
      }

      // Assign thumbnails: pick a middle frame from the first video for each couple
      // We pick sequential frames so each couple gets a different-looking image
      setProgress("Generating thumbnails…");
      const thumbnailFrames = allFrames.slice(0, parsed.ranked_couples.length);
      parsed.ranked_couples = parsed.ranked_couples.map((c, i) => ({
        ...c,
        color: COUPLE_COLORS[i % COUPLE_COLORS.length],
        thumbnail: thumbnailFrames[i]?.b64 || allFrames[Math.floor(i * allFrames.length / parsed.ranked_couples.length)]?.b64 || null,
      }));

      setResults(parsed);
      const defaultExpand = (myCoupleEnabled && myCouple != null)
        ? myCouple
        : (parsed.ranked_couples.find(c => c.rank === 1)?.number ?? parsed.ranked_couples[0]?.number ?? null);
      setExpandedCouple(defaultExpand);
      setStep("results");
    } catch (e) {
      console.error(e);
      setError(e.message || "Analysis failed. Please try again.");
      setStep("setup");
    }
  };

  const myResult = (myCoupleEnabled && myCouple != null) ? results?.ranked_couples?.find(c => c.number === myCouple) : null;

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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: myCoupleEnabled ? 14 : 0 }}>
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.6)" }}>Highlight my couple</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.25)", marginTop: 3 }}>Optional — enter your bib number (worn on the man's back)</div>
                  </div>
                  <button
                    onClick={() => { setMyCoupleEnabled(!myCoupleEnabled); if (myCoupleEnabled) setMyCouple(null); }}
                    style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: myCoupleEnabled ? "#E8C547" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#0a0a0f", position: "absolute", top: 3, left: myCoupleEnabled ? 21 : 3, transition: "left 0.2s" }} />
                  </button>
                </div>
                {myCoupleEnabled && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.4)", letterSpacing: 1 }}>BIB #</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={9999}
                      value={myCouple ?? ""}
                      onChange={e => {
                        const n = parseInt(e.target.value, 10);
                        setMyCouple(isNaN(n) ? null : n);
                      }}
                      onClick={e => e.stopPropagation()}
                      placeholder="e.g. 127"
                      style={{ width: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(232,197,71,0.3)", borderRadius: 8, padding: "8px 12px", color: "#E8C547", fontFamily: "'DM Mono', monospace", fontSize: 14, outline: "none", textAlign: "center" }}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Video Upload */}
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#E8C547", letterSpacing: 2, textTransform: "uppercase" }}>04 — Video{videos.length > 1 ? "s" : ""}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.4)" }}>{videos.length} / {MAX_VIDEOS}</div>
              </div>

              {/* Uploaded videos list */}
              {videos.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {videos.map((v, i) => (
                    <div key={v.id} style={{ background: "rgba(123,232,71,0.04)", border: "1px solid rgba(123,232,71,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#7BE847", letterSpacing: 1, flexShrink: 0 }}>
                        {videos.length > 1 ? `ANGLE ${i + 1}` : "✓"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Lora', serif", fontSize: 13, color: "rgba(240,236,224,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.file.name}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.4)" }}>{(v.file.size / 1e6).toFixed(1)} MB</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeVideo(v.id); }}
                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(240,236,224,0.5)", borderRadius: 6, padding: "4px 10px", fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add video button */}
              {videos.length < MAX_VIDEOS && (
                <div
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                  style={{ border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: videos.length > 0 ? "18px 24px" : "32px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: "transparent" }}>
                  <input ref={fileRef} type="file" accept="video/*" multiple style={{ display: "none" }} onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
                  <div style={{ fontSize: videos.length > 0 ? 20 : 28, marginBottom: videos.length > 0 ? 4 : 8, opacity: 0.4 }}>{videos.length > 0 ? "+" : "🎬"}</div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: videos.length > 0 ? 12 : 14, color: "rgba(240,236,224,0.5)" }}>
                    {videos.length === 0 ? "Drop your competition video here" : `Add another angle (${MAX_VIDEOS - videos.length} remaining)`}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.25)", marginTop: 6 }}>or click to browse · MP4, MOV, AVI</div>
                </div>
              )}

              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(71,181,232,0.06)", border: "1px solid rgba(71,181,232,0.15)", borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.55)", lineHeight: 1.6 }}>
                💡 <strong style={{ color: "#47B5E8" }}>Multi-angle tip:</strong> Upload up to 3 videos of the SAME performance from different angles (e.g. long side, short side, corner) for a more accurate analysis. The AI will synthesise across angles.
              </div>
            </section>

            <button
              onClick={analyse}
              disabled={videos.length === 0}
              style={{ width: "100%", padding: "16px", borderRadius: 10, border: "none", background: videos.length > 0 ? "#E8C547" : "rgba(255,255,255,0.05)", color: videos.length > 0 ? "#0a0a0f" : "rgba(255,255,255,0.2)", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, cursor: videos.length > 0 ? "pointer" : "not-allowed", letterSpacing: 0.5, transition: "all 0.2s" }}>
              Analyse {videos.length > 1 ? `${videos.length} angles` : ""} with WDSF Standards →
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
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.35)", letterSpacing: 1 }}>{round} · {results.ranked_couples?.length} couples{results.angles_analysed > 1 ? ` · ${results.angles_analysed} angles` : ""}</span>
              </div>
              <button onClick={() => { setStep("setup"); setResults(null); videos.forEach(v => URL.revokeObjectURL(v.url)); setVideos([]); }}
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
              <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13, color: "rgba(240,236,224,0.4)", marginBottom: 16, padding: "0 4px", lineHeight: 1.7 }}>
                "{results.heat_summary}"
              </div>
            )}

            {/* Identification notes */}
            {results.identification_notes && (
              <div style={{ background: "rgba(232,197,71,0.05)", border: "1px solid rgba(232,197,71,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.55)", lineHeight: 1.6 }}>
                <strong style={{ color: "#E8C547" }}>ID NOTE:</strong> {results.identification_notes}
              </div>
            )}

            {/* Ranked couples */}
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Full Rankings</div>
            {[...results.ranked_couples].sort((a, b) => a.rank - b.rank).map((couple, idx) => (
              <CoupleCard
                key={couple.number ?? `unknown-${idx}`}
                couple={couple}
                rank={couple.rank}
                color={(myCoupleEnabled && myCouple != null && myCouple === couple.number) ? "#E8C547" : couple.color}
                expanded={expandedCouple === (couple.number ?? `unknown-${idx}`)}
                onToggle={() => setExpandedCouple(expandedCouple === (couple.number ?? `unknown-${idx}`) ? null : (couple.number ?? `unknown-${idx}`))}
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
