import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "my-camping-app.marcus-edevag.workers.dev", // Your live worker domain
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;
