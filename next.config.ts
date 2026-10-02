import type { NextConfig } from "next";

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
};

export default nextConfig;
