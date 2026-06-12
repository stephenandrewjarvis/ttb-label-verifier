import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: { unoptimized: true },
  serverExternalPackages: ["tesseract.js"],
  // sharp is excluded — Next.js lists it as optional and handles MODULE_NOT_FOUND gracefully.
  // Tesseract's worker, WASM core, and language data are loaded via runtime-built paths
  // that Next's static file tracer can't detect. Force them into the serverless bundle so
  // OCR runs fully offline on Vercel (no CDN download — matches the on-prem network constraint).
  outputFileTracingIncludes: {
    "/api/verify": [
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./eng.traineddata",
    ],
    "/api/verify-batch": [
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./eng.traineddata",
    ],
  },
};

export default nextConfig;
