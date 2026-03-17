import type { NextConfig } from "next";

// ── Build-time check: crash if secrets are accidentally exposed to the client ──
const FORBIDDEN_PUBLIC_KEYS = ["ANTHROPIC_API_KEY", "MONGODB_URI", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"];
for (const key of FORBIDDEN_PUBLIC_KEYS) {
  if (process.env[`NEXT_PUBLIC_${key}`]) {
    throw new Error(`SECURITY: ${key} must NOT be prefixed with NEXT_PUBLIC_. It would be exposed to the browser.`);
  }
}

const nextConfig: NextConfig = {
  // swisseph and tz-lookup are native/CJS modules — must not be bundled
  serverExternalPackages: ["swisseph", "tz-lookup"],

  experimental: {
    serverActions: {
      bodySizeLimit: "10kb",
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com",
              "connect-src 'self' https://api.anthropic.com https://accounts.google.com https://nominatim.openstreetmap.org",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
