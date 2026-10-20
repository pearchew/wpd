import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The ledger, votes and research files are read from disk at request/build
  // time, so make sure Vercel ships them with the serverless functions.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*", "./content/**/*"],
  },
  // The research form uploads Excel models (up to 4 MB) through a server action.
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
