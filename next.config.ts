import type { NextConfig } from "next";
import { cspImgSrc, resolveImageHosts } from "./src/lib/poc/image-hosts";

/**
 * Restrictive CSP covering only the origins this app actually uses: self,
 * the shared image-host allowlist (cspImgSrc builds img-src from the same
 * validated collection isAllowedImageUrl resolves at runtime, so a
 * configured CDN can never pass validation and still be blocked by the
 * browser, or vice versa), and the trusted Google Maps embed endpoints. No
 * unsanitized environment value reaches a directive. Scripts/styles allow
 * 'unsafe-inline' because Next.js hydration injects inline bootstrap; a
 * nonce-based policy is on the Phase 5 backlog.
 */
const imageHosts = resolveImageHosts(process.env);

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src ${cspImgSrc(process.env)}`,
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker deployment (see Dockerfile).
  // Local `next start` keeps working; this only ADDS .next/standalone.
  output: "standalone",
  images: {
    // Demo POC records use remote placeholder photography. The optimizer's
    // cold upstream fetch can exceed the browser's image timeout on a first
    // view, which reads as a broken hero during outreach demos. Serving the
    // original CDN URLs directly is more robust for this use case; width and
    // height attributes still reserve layout space, so CLS is unaffected.
    // remotePatterns derive from the same validated host collection as the
    // CSP and runtime URL validation.
    unoptimized: true,
    remotePatterns: imageHosts.map((host) => ({ protocol: "https" as const, hostname: host })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
