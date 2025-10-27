import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Static export configuration
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Required headers for FHEVM SDK (SharedArrayBuffer support)
  // Note: Headers don't apply in static export, needs to be handled by hosting server
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
