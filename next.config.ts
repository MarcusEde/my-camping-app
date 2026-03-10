import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "my-camping-app.marcus-edevag.workers.dev",
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;
