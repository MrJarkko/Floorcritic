// Worker entry point (Workers Static Assets model).
//
// Replaces the Pages Functions file-routing convention: Pages mapped
// functions/api/upload.js -> /api/upload automatically, but a Worker needs one
// entry script that routes explicitly and serves static assets via env.ASSETS.

import { handleUploadUrl } from "./upload-url.js";
import { handleUploadChunk } from "./upload-chunk.js";
import { handleAnalyse } from "./analyse.js";

// ffmpeg.wasm needs SharedArrayBuffer, which requires cross-origin isolation.
// We stamp these in code rather than relying on public/_headers so the guarantee
// doesn't depend on static-asset header support.
const ISOLATION_HEADERS = {
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const methodNotAllowed = () =>
  new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", Allow: "POST" },
  });

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/upload-url") {
      return request.method === "POST" ? handleUploadUrl(request, env) : methodNotAllowed();
    }
    if (pathname === "/api/upload-chunk") {
      return request.method === "POST" ? handleUploadChunk(request, env) : methodNotAllowed();
    }
    if (pathname === "/api/analyse") {
      return request.method === "POST" ? handleAnalyse(request, env) : methodNotAllowed();
    }
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: `Unknown endpoint: ${pathname}` }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Everything else: static assets from dist/, with isolation headers added.
    const assetRes = await env.ASSETS.fetch(request);
    const res = new Response(assetRes.body, assetRes);
    for (const [k, v] of Object.entries(ISOLATION_HEADERS)) res.headers.set(k, v);
    return res;
  },
};
