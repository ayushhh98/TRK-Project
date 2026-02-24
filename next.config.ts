import type { NextConfig } from "next";

// NEXT_PUBLIC_API_URL is the backend base (e.g. https://trk-project.onrender.com) WITHOUT /api.
// lib/api.ts appends /api itself. For the Next.js rewrite proxy we must add /api here.
const _apiBase = (process.env.NEXT_PUBLIC_API_URL?.trim() || "https://trk-backend.onrender.com").replace(/\/+$/, "");
const backendApiBase = _apiBase.replace(/\/api\/?$/, "") + "/api";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org"
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiBase}/:path*`, // Proxy to Backend (env-aware for prod)
      },
    ]
  },
};

export default nextConfig;
