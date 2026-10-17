import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  agentRules: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.base44.com",
        pathname: "/images/public/**",
      },
    ],
  },
};

export default nextConfig;
