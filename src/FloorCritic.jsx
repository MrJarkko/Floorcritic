import { useState, useRef, useCallback, useEffect } from "react";

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
  // null means the model judged this criterion unassessable from the footage —
  // show that plainly instead of implying a zero.
  if (typeof score !== "number" || !isFinite(score)) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: "100%", height: "100%", background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 4px, transparent 4px 8px)" }} />
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.35)", minWidth: 28 }}>n/a</span>
      </div>
    );
  }
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

// How clearly the model could actually observe this couple.
function EvidenceBadge({ quality }) {
  if (!quality) return null;
  const map = {
    good: { label: "CLEARLY SEEN", color: "#7BE847" },
    partial: { label: "PARTLY VISIBLE", color: "#E8C547" },
    poor: { label: "BARELY VISIBLE", color: "#E85D47" },
  };
  const m = map[String(quality).toLowerCase()];
  if (!m) return null;
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1,
      color: m.color, border: `1px solid ${m.color}44`, background: `${m.color}14`,
      borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap",
    }}>{m.label}</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.5)" }}>
              {typeof couple.overall === "number" ? `Overall: ${couple.overall.toFixed(1)} / 10` : "Overall: not assessable"}
            </span>
            <EvidenceBadge quality={couple.evidence_quality} />
          </div>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.4)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>▼</div>
      </div>

      {expanded && couple.scores && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Large image at top of expanded view */}
          {couple.thumbnail && (
            <div
              onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("floorcritic:viewimage", { detail: { src: couple.thumbnail, number: couple.number, hint: couple.thumbnail_hint } })); }}
              style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", position: "relative", cursor: "zoom-in", background: "#000" }}>
              <img
                src={`data:image/jpeg;base64,${couple.thumbnail}`}
                alt={`Couple ${couple.number ?? ""}`}
                style={{ width: "100%", display: "block", maxHeight: 360, objectFit: "contain", background: "#000" }}
              />
              <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", borderRadius: 6, padding: "4px 8px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#f0ece0", letterSpacing: 1 }}>
                ⤢ TAP TO ZOOM
              </div>
            </div>
          )}

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

          {!couple.positives?.length && !couple.faults?.length && (
            <div style={{ marginTop: 14, fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 12, color: "rgba(240,236,224,0.4)", lineHeight: 1.6 }}>
              No specific observations could be grounded in the footage for this couple.
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
  const [imageViewer, setImageViewer] = useState(null); // { src, number, hint } or null
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

  // Listen for image-zoom events from CoupleCard
  useEffect(() => {
    const handler = (e) => setImageViewer(e.detail);
    window.addEventListener("floorcritic:viewimage", handler);
    return () => window.removeEventListener("floorcritic:viewimage", handler);
  }, []);

  // Close viewer on Escape
  useEffect(() => {
    if (!imageViewer) return;
    const onKey = (e) => { if (e.key === "Escape") setImageViewer(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageViewer]);

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


  // Target slice size. The actual size is rounded up to a multiple of the
  // granularity Google reports for the session (8MB today) — non-final chunks
  // that aren't a multiple are rejected. Stays well under Cloudflare's 100MB cap.
  const TARGET_CHUNK_SIZE = 16 * 1024 * 1024;

  // POST one slice via XHR so we get byte-level progress for the status line.
  const sendChunk = (uploadUrl, chunk, offset, isLast, onBytes) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-chunk", true);
    xhr.setRequestHeader("x-upload-url", uploadUrl);
    xhr.setRequestHeader("x-goog-upload-offset", String(offset));
    xhr.setRequestHeader("x-goog-upload-command", isLast ? "upload, finalize" : "upload");
    xhr.setRequestHeader("x-chunk-length", String(chunk.size));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onBytes) onBytes(e.loaded); };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let msg = `Upload failed (${xhr.status})`;
        try { const j = JSON.parse(xhr.responseText); if (j.error) msg = j.error; } catch { /* keep default */ }
        reject(new Error(msg));
        return;
      }
      try { resolve(JSON.parse(xhr.responseText)); }
      catch { reject(new Error("Unreadable upload response.")); }
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and try again."));
    xhr.send(chunk);
  });

  // ─── Upload one video to Gemini ───
  // Open a resumable session via our Worker (which holds GEMINI_API_KEY), then
  // push the file through /api/upload-chunk in slices. Chunking is what lifts the
  // old size ceiling: Cloudflare caps any single request body at 100MB, but the
  // total is bounded only by Gemini's 2GB per-file limit.
  //
  // The browser cannot POST to Google directly — verified: the CORS preflight
  // passes but Google's actual upload response omits Access-Control-Allow-Origin,
  // so the browser blocks it.
  const uploadFileToGemini = async (file, mimeType, onProgress) => {
    console.log("[uploadFileToGemini] start", file.name, (file.size / 1e6).toFixed(1), "MB", mimeType);

    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: file.name, mimeType, numBytes: file.size }),
    });
    const raw = await res.text();
    if (!res.ok) {
      let msg = `Could not start upload (${res.status})`;
      try { const j = JSON.parse(raw); if (j.error) msg = j.error; } catch { msg = `${msg}: ${raw.slice(0, 200)}`; }
      console.error("[uploadFileToGemini] session failed:", msg);
      throw new Error(msg);
    }
    const { uploadUrl, granularity } = JSON.parse(raw);
    if (!uploadUrl) throw new Error("No upload URL returned");

    // Round the target up to a whole number of granularity units.
    const gran = granularity || 8 * 1024 * 1024;
    const chunkSize = Math.max(gran, Math.ceil(TARGET_CHUNK_SIZE / gran) * gran);

    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
    console.log(`[uploadFileToGemini] session open, ${totalChunks} chunk(s) of ${(chunkSize / 1048576).toFixed(0)}MB (granularity ${(gran / 1048576).toFixed(0)}MB)`);

    let result = null;
    for (let offset = 0, i = 0; offset < file.size || i === 0; offset += chunkSize, i++) {
      const end = Math.min(offset + chunkSize, file.size);
      const chunk = file.slice(offset, end);
      const isLast = end >= file.size;
      const base = offset;
      result = await sendChunk(uploadUrl, chunk, offset, isLast, (loaded) => {
        if (onProgress) onProgress(Math.min(1, (base + loaded) / file.size));
      });
      console.log(`[uploadFileToGemini] chunk ${i + 1}/${totalChunks} done (${end}/${file.size} bytes)`);
      if (isLast) break;
    }

    if (!result?.name) throw new Error("Upload finished but Gemini returned no file reference.");
    console.log("[uploadFileToGemini] uploaded →", result.name, result.state);
    return result; // { name, uri, mimeType, state }
  };

  // ─── Helper: transcode HEVC to H.264 via ffmpeg.wasm if needed ───
  const transcodeIfNeeded = useCallback(async (file) => {
    // Check if browser can play it natively — if not, likely HEVC
    const canPlay = await new Promise(resolve => {
      const v = document.createElement("video");
      v.muted = true;
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve(!!(v.videoWidth && v.videoHeight));
      v.onerror = () => resolve(false);
      v.src = URL.createObjectURL(file);
      setTimeout(() => resolve(false), 5000); // fallback timeout
    });

    if (canPlay) return { file, mimeType: file.type || "video/mp4" };

    console.log("Video appears to be HEVC/unsupported — transcoding to H.264");
    setProgress("Converting video format (HEVC → H.264)…");
    const { ffmpeg, fetchFile } = await loadFFmpeg();
    const inputName = "input" + (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".mov");
    const outputName = "output.mp4";
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec([
      "-i", inputName,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28",
      "-c:a", "aac",
      "-b:a", "96k",
      "-movflags", "+faststart",
      outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    const newFile = new File([blob], file.name.replace(/\.[^.]+$/, ".mp4"), { type: "video/mp4" });
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    return { file: newFile, mimeType: "video/mp4" };
  }, [loadFFmpeg]);

  // ─── Extract one frame per couple, at the moment Gemini says each is best seen ───
  // specs: [{ t: seconds, box: [ymin,xmin,ymax,xmax] 0-1000 | null }]
  // Seeks a single <video> through the requested times in order, so one pass covers
  // every couple. Returns base64 JPEGs (null where a frame couldn't be captured).
  const extractFramesAtTimes = useCallback(async (file, specs) => {
    if (!specs.length) return [];

    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const results = new Array(specs.length).fill(null);

    // Resolve on an event, but never hang if the event never arrives — a stalled
    // seek must cost us one thumbnail, not all of them.
    const once = (target, event, ms) => new Promise((res) => {
      let done = false;
      const on = () => { if (!done) { done = true; cleanup(); res(true); } };
      const timer = setTimeout(() => { if (!done) { done = true; cleanup(); res(false); } }, ms);
      const cleanup = () => { clearTimeout(timer); target.removeEventListener(event, on); };
      target.addEventListener(event, on);
    });

    try {
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      if (video.readyState < 1) await once(video, "loadedmetadata", 15000);
      const dur = video.duration, vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh || !isFinite(dur) || dur <= 0) {
        console.warn("[thumbnails] no usable video dimensions/duration; skipping");
        return results;
      }
      // Seeking is far more reliable once actual frame data is buffered.
      if (video.readyState < 2) await once(video, "loadeddata", 15000);

      for (let i = 0; i < specs.length; i++) {
        const raw = Number(specs[i]?.t);
        const t = isFinite(raw) && raw > 0
          ? Math.min(Math.max(raw, 0.1), Math.max(0.1, dur - 0.1))
          : dur * (0.15 + 0.7 * ((i + 1) / (specs.length + 1)));

        try {
          if (Math.abs(video.currentTime - t) > 0.05) {
            const seeked = once(video, "seeked", 6000);
            video.currentTime = t;
            const ok = await seeked;
            if (!ok) console.warn(`[thumbnails] seek to ${t.toFixed(1)}s did not signal; drawing anyway`);
          }
          // Wait for a frame to actually be presented where the browser supports it.
          if (typeof video.requestVideoFrameCallback === "function") {
            await new Promise((res) => {
              const id = setTimeout(res, 1000);
              video.requestVideoFrameCallback(() => { clearTimeout(id); res(); });
            });
          }

          const box = specs[i]?.box;
          // Default to the full frame; crop to the couple when a sane box is given.
          let sx = 0, sy = 0, sw = vw, sh = vh;
          if (Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === "number")) {
            const [ymin, xmin, ymax, xmax] = box;
            if (ymax > ymin && xmax > xmin && xmin >= 0 && ymin >= 0 && xmax <= 1000 && ymax <= 1000) {
              const bx = (xmin / 1000) * vw;
              const by = (ymin / 1000) * vh;
              const bw = ((xmax - xmin) / 1000) * vw;
              const bh = ((ymax - ymin) / 1000) * vh;
              // Pad around the box so the couple isn't cropped tight to the edges.
              const pad = Math.max(bw, bh) * 0.25;
              sx = Math.max(0, bx - pad);
              sy = Math.max(0, by - pad);
              sw = Math.min(vw - sx, bw + pad * 2);
              sh = Math.min(vh - sy, bh + pad * 2);
            }
          }

          const maxEdge = 640;
          const scale = Math.min(1, maxEdge / Math.max(sw, sh));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(sw * scale));
          canvas.height = Math.max(1, Math.round(sh * scale));
          canvas.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          // A blank/undecoded frame compresses to almost nothing — treat as a miss.
          if (dataUrl.length > 2000) results[i] = dataUrl.split(",")[1];
        } catch (e) {
          console.warn("[thumbnails] capture failed at index", i, e);
        }
      }
    } finally {
      video.src = "";
      URL.revokeObjectURL(objectUrl);
    }

    console.log(`[thumbnails] captured ${results.filter(Boolean).length}/${specs.length}`);
    return results;
  }, []);

  const analyse = async () => {
    console.log("[analyse] START — videos:", videos.length, videos.map(v => ({ name: v.file.name, sizeMB: (v.file.size / 1e6).toFixed(1), type: v.file.type })));
    if (videos.length === 0) return;
    setStep("analysing");
    setError(null);

    try {
      // Step 1: Transcode any HEVC videos to H.264 so Gemini accepts them cleanly
      console.log("[analyse] Step 1: transcodeIfNeeded");
      setProgress("Preparing videos…");
      const preparedVideos = [];
      for (let i = 0; i < videos.length; i++) {
        setProgress(`Preparing video ${i + 1} of ${videos.length}…`);
        const { file, mimeType } = await transcodeIfNeeded(videos[i].file);
        console.log(`[analyse] prepared video ${i + 1}:`, file.name, (file.size / 1e6).toFixed(1), "MB", mimeType);
        preparedVideos.push({ file, mimeType, originalId: videos[i].id });
      }

      // Thumbnails are extracted AFTER analysis — Gemini tells us which moment
      // shows each couple best, so there is nothing useful to capture up front.

      // Step 3: Upload each video directly to Gemini (streamed via our Worker),
      // collecting the lightweight file references we'll pass to /api/analyse.
      const totalMB = preparedVideos.reduce((s, pv) => s + pv.file.size, 0) / 1024 / 1024;
      console.log(`[analyse] Step 3: uploading ${preparedVideos.length} video(s), ${totalMB.toFixed(1)} MB total`);
      const files = [];
      for (let i = 0; i < preparedVideos.length; i++) {
        const label = preparedVideos.length > 1 ? `video ${i + 1} of ${preparedVideos.length}` : "video";
        const sizeMB = preparedVideos[i].file.size / 1024 / 1024;
        setProgress(`Uploading ${label}… 0%`);
        const uploaded = await uploadFileToGemini(
          preparedVideos[i].file,
          preparedVideos[i].mimeType,
          (frac) => setProgress(`Uploading ${label}… ${Math.round(frac * 100)}% of ${sizeMB.toFixed(0)}MB`)
        );
        files.push({ name: uploaded.name, mimeType: uploaded.mimeType });
      }
      console.log("[analyse] all uploads done, file refs:", files.map(f => f.name));

      // Step 4: Build prompts
      const criteria = WDSF_CRITERIA[danceStyle].join(", ");
      const multiVideo = videos.length > 1;

      const systemPrompt = `You are a WDSF (World Dance Sport Federation) ballroom dance adjudicator analysing competition video footage, applying official WDSF adjudication criteria.

Your usefulness depends entirely on being accurate about what is ACTUALLY VISIBLE in this footage. The user is a competitor who will act on your feedback. A short, honest assessment is far more valuable than a complete-looking one built on plausible guesses. Competition video is usually shot from a distance, hand-held, with couples repeatedly blocked by other couples — you are expected to be unable to assess many things, and saying so is a correct answer.

EVIDENCE RULES — these override every other instruction:
- Report ONLY what you can see or hear in this specific footage. Never supply typical or expected dance-coaching commentary.
- Every entry in "positives" and "faults" MUST begin with a timestamp of the moment you observed it, formatted [M:SS]. If you cannot point to a specific moment, do not make the claim at all.
- If a criterion cannot be judged (couple too distant, blocked, out of frame, motion-blurred, bad angle), set that score to null. Do NOT estimate a plausible number.
- Fewer, well-grounded observations beat many plausible ones. Empty arrays are correct for a couple who is rarely in clear view.
- If you cannot track a couple as a distinct pair through the heat, OMIT them entirely rather than guessing.
- If the audio is missing or too poor to hear the beat, set Timing & Musicality to null for everyone and say so in footage_limitations.

NEVER FABRICATE:
- Bib numbers. If you cannot literally read the digits, set "number": null.
- Facial expressions or eye contact when faces are too small to resolve.
- Specific footwork or foot positions you did not clearly see.
- Costume or appearance details beyond what is actually distinguishable.
- A complete ranking of couples you could not genuinely compare.

${multiVideo ? `IMPORTANT: You are receiving ${videos.length} DIFFERENT camera angles of the SAME heat. Synthesise observations across all angles for each couple — different angles reveal different technical details.` : ""}

ANALYSIS APPROACH:
- You can see the FULL video with audio. Watch how couples move to the music, not just their shapes.
- For TIMING & MUSICALITY: listen to the beat and observe whether couples' steps land on the correct counts. ${dance === "Waltz" || dance === "Viennese Waltz" ? "Waltz: verify the 1-2-3 pattern with proper rise-and-fall." : dance === "Tango" ? "Tango: staccato accents on beats, held body positions." : dance === "Quickstep" ? "Quickstep: SQQ or SS timing, lightness on quicks." : dance === "Foxtrot" ? "Foxtrot: SQQ timing with smooth long steps." : dance === "Cha Cha" ? "Cha cha: 2-3-4&1 split-beat timing, hip action on 1." : dance === "Samba" ? "Samba: bounce action, 1a2 rhythm, hip roll on a." : dance === "Rumba" ? "Rumba: slow 2-3-4-1, hip settles on the &." : dance === "Paso Doble" ? "Paso Doble: march-like 1-2 timing, strong body shapes." : dance === "Jive" ? "Jive: QQS-QQS with chick-chicken triple steps and kick-ball-change." : `Check ${dance}-specific rhythm patterns.`}
- For FLOOR CRAFT: watch navigation and near-collisions across the whole floor.
- For TECHNIQUE: evaluate posture, footwork, frame (Standard) or hip action, leg action (Latin).
- For PRESENTATION: assess performance quality, confidence, expression throughout.
- For PARTNERSHIP: synchronisation, connection, lead-follow clarity.

COUPLE IDENTIFICATION (CRITICAL):
- Each couple wears a BIB NUMBER pinned to the man's back (large printed number).
- You MUST use the actual bib number you read as the couple's "number" field.
- If you cannot clearly read a bib number, set "number" to null and describe the couple in "thumbnail_hint" (e.g. "red dress, tall male partner").
- NEVER invent bib numbers.

THUMBNAIL FRAME (needed to illustrate each couple):
- For every couple, give "best_frame_time": the time in SECONDS (a number, e.g. 47.5) at the moment this couple is most clearly and unobstructedly visible.
- Pick a moment where this couple is large in frame and not blocked by others. Different couples should generally have different times.
- Optionally add "box": [ymin, xmin, ymax, xmax] locating the couple in that frame, each 0-1000 normalised to image height/width. Include it only if you are confident; omit otherwise.

Respond ONLY with a valid JSON object matching this schema exactly:
{
  "dance": "${dance}",
  "round": "${round}",
  "angles_analysed": ${videos.length},
  "ranked_couples": [
    {
      "number": <bib number integer, or null if not readable>,
      "number_confidence": <"high" | "medium" | "low">,
      "thumbnail_hint": "<short visual description, only details actually distinguishable>",
      "best_frame_time": <seconds as a number>,
      "box": <[ymin,xmin,ymax,xmax] 0-1000, or omit>,
      "evidence_quality": <"good" | "partial" | "poor" — how clearly you could actually observe this couple>,
      "rank": <integer, 1 is best, among the couples you report>,
      "overall": <number 0-10 one decimal, or null if too little was assessable>,
      "scores": {
${WDSF_CRITERIA[danceStyle].map(c => `        "${c}": <number 0-10 one decimal, or null if not assessable>`).join(",\n")}
      },
      "positives": [<0-4 observations, each starting with [M:SS]. Use [] if none are grounded.>],
      "faults": [<0-4 observations, each starting with [M:SS]. Use [] if none are grounded.>],
      "summary": "<2-3 sentences. State plainly if visibility limited the assessment.>"
    }
  ],
  "heat_summary": "<overall heat assessment based only on what was visible>",
  "standout_couple": <bib number of top couple, or null if no confident pick>,
  "identification_notes": "<notes about unreadable bib numbers>",
  "footage_limitations": "<what this footage did NOT allow you to assess, and why (distance, blocking, audio, resolution). Write 'None significant' only if genuinely so.>"
}

Report only couples you could actually distinguish and follow. The user expects roughly ${numCouples} couples, but returning fewer with honest detail is better than padding the list. Rank the couples you do report, 1 = best.`;

      const userPrompt = `Analyse this WDSF ${danceStyle} ${dance} competition footage (${round}).
Competition: ${competition || "WDSF competition"}
Expected couples: ~${numCouples}
Angles provided: ${videos.length}${myCoupleEnabled && myCouple ? `\nUser's bib number: #${myCouple} — include this couple in your analysis if visible.` : ""}

WDSF criteria: ${criteria}

Be specific, objective, and honest. The user is a competitor seeking to improve, and will act on what you say — so ground every observation in a moment you actually saw, and use null / empty arrays wherever the footage does not support a judgement.`;

      setProgress("Sending to Gemini for WDSF analysis… (this may take 30-90s)");

      console.log(`[analyse] Step 4: POST /api/analyse with ${files.length} file ref(s) (tiny JSON — no video bytes)`);

      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userPrompt, files })
      });

      console.log(`[analyse] response: ${response.status} ${response.statusText}, content-type: ${response.headers.get("content-type")}`);

      if (!response.ok) {
        // Read the body ONCE as text, then try to parse as JSON.
        // (Reading it twice — .json() then .text() — throws "Body is disturbed or locked",
        //  which is the misleading error users were actually seeing.)
        const raw = await response.text();
        let errMsg = `API ${response.status}`;
        try {
          const errJson = JSON.parse(raw);
          if (errJson.error) errMsg = errJson.error;
        } catch {
          errMsg = `API ${response.status}: ${raw.slice(0, 200)}`;
        }
        console.error("[analyse] request failed:", errMsg, "| raw body:", raw.slice(0, 300));
        throw new Error(errMsg);
      }

      const { text } = await response.json();
      console.log("Gemini response:", text);

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const first = text.indexOf("{");
        const last = text.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
          parsed = JSON.parse(text.slice(first, last + 1));
        } else {
          throw new Error("Model returned invalid JSON. See console.");
        }
      }

      if (!parsed.ranked_couples || !Array.isArray(parsed.ranked_couples)) {
        throw new Error("Analysis response missing couples data.");
      }

      // Grab one frame per couple at the moment Gemini flagged, cropped to its box
      // when it supplied one. Best-effort: a failure here must not lose the analysis.
      setProgress("Capturing couple thumbnails…");
      let thumbs = [];
      try {
        thumbs = await extractFramesAtTimes(
          preparedVideos[0].file,
          parsed.ranked_couples.map((c) => ({ t: c.best_frame_time, box: c.box }))
        );
      } catch (e) {
        console.warn("[analyse] thumbnail extraction failed, continuing without:", e);
      }

      parsed.ranked_couples = parsed.ranked_couples.map((c, i) => ({
        ...c,
        color: COUPLE_COLORS[i % COUPLE_COLORS.length],
        thumbnail: thumbs[i] || null,
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
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
                💡 <strong style={{ color: "#47B5E8" }}>Full video analysis:</strong> Unlike frame-based tools, FloorCritic analyses the complete video including audio so it can evaluate musicality and timing. Upload up to 3 angles of the same performance for best results. Full-length heats are fine — up to 2GB per video.
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
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: "#E8C547", lineHeight: 1 }}>
                        {typeof featured.overall === "number" ? featured.overall.toFixed(1) : "—"}
                      </div>
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

            {/* What the footage did not allow — sets expectations before the scores */}
            {results.footage_limitations && !/^none significant\.?$/i.test(results.footage_limitations.trim()) && (
              <div style={{ background: "rgba(232,93,71,0.06)", border: "1px solid rgba(232,93,71,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.6)", lineHeight: 1.6 }}>
                <strong style={{ color: "#E85D47" }}>FOOTAGE LIMITS:</strong> {results.footage_limitations}
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
            {[...results.ranked_couples].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).map((couple, idx) => (
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

      {/* Fullscreen image viewer */}
      {imageViewer && (
        <div
          onClick={() => setImageViewer(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "20px", animation: "fadeIn 0.2s ease",
          }}>
          <button
            onClick={(e) => { e.stopPropagation(); setImageViewer(null); }}
            style={{
              position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.5)", color: "#f0ece0",
              fontFamily: "'DM Mono', monospace", fontSize: 18, cursor: "pointer", zIndex: 1001,
            }}>✕</button>

          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(240,236,224,0.5)", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
            {imageViewer.number != null ? `Couple #${imageViewer.number}` : "Unknown couple"}
          </div>

          <img
            src={`data:image/jpeg;base64,${imageViewer.src}`}
            alt={`Couple ${imageViewer.number ?? ""}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }}
          />

          {imageViewer.hint && (
            <div style={{ marginTop: 14, fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 13, color: "rgba(240,236,224,0.6)", textAlign: "center", maxWidth: 500 }}>
              {imageViewer.hint}
            </div>
          )}
          <div style={{ marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(240,236,224,0.3)", letterSpacing: 1 }}>
            TAP ANYWHERE OR PRESS ESC TO CLOSE
          </div>
        </div>
      )}
    </div>
  );
}
