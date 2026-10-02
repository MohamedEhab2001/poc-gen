import type { NextConfig } from "next";
import { resolveImageHosts } from "./src/lib/poc/image-hosts";

/**
 * Restrictive CSP covering only the origins this app actually uses: self,
 * the shared image-host allowlist (the same source isAllowedImageUrl uses,
 * so a configured CDN can never pass validation and still be blocked by the
 * browser), and the trusted Google Maps embed endpoints. Hosts come from the
 * validated parser; no unsanitized environment value reaches a directive.
 * Scripts/styles allow 'unsafe-inline' because Next.js hydration injects
 * inline bootstrap; a nonce-based policy is on the Phase 5 backlog.
 */
const imageHosts = resolveImageHosts(process.env);
const imgSrc = `'self' data: blob: ${imageHosts.map((host) => `https://${host}`).join(" ")}`;

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc}`,
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    // Demo POC records use remote placeholder photography. The optimizer's
    // cold upstream fetch can exceed the browser's image timeout on a first
    // view, which reads as a broken hero during outreach demos. Serving the
    // original CDN URLs directly is more robust for this use case; width and
    // height attributes still reserve layout space, so CLS is unaffected.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "i.picsum.photos" },
    ],
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
