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
      "./node_modules/bmp-js/**",
      "./node_modules/idb-keyval/**",
      "./node_modules/is-electron/**",
      "./node_modules/is-url/**",
      "./node_modules/node-fetch/**",
      "./node_modules/regenerator-runtime/**",
      "./node_modules/wasm-feature-detect/**",
      "./node_modules/zlibjs/**",
      "./eng.traineddata",
    ],
    "/api/verify-batch": [
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/bmp-js/**",
      "./node_modules/idb-keyval/**",
      "./node_modules/is-electron/**",
      "./node_modules/is-url/**",
      "./node_modules/node-fetch/**",
      "./node_modules/regenerator-runtime/**",
      "./node_modules/wasm-feature-detect/**",
      "./node_modules/zlibjs/**",
      "./eng.traineddata",
    ],
  },
};

export default nextConfig;
