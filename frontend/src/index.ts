import { serve } from "bun";
import index from "./index.html";

/** Proxy target for the Python backend. Override via BACKEND_URL env var. */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const server = serve({
  routes: {
    /**
     * Proxy all /api/* requests to the FastAPI backend.
     * This keeps the same-origin behaviour consistent with production
     * (where an Ingress controller routes /api/* to the backend pod).
     */
    "/api/*": async (req) => {
      const url = new URL(req.url);
      const targetUrl = `${BACKEND_URL}${url.pathname}${url.search}`;
      const headers = new Headers(req.headers);
      headers.set("host", new URL(BACKEND_URL).host);
      try {
        return await fetch(targetUrl, {
          method: req.method,
          headers,
          body: req.body,
        });
      } catch {
        return Response.json(
          { error: "Backend unavailable — start the FastAPI server on port 8000" },
          { status: 503 },
        );
      }
    },

    // SPA fallback — serve index.html for every non-API route
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
