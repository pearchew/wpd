import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The ledger, votes and research files are read from disk at request/build
  // time, so make sure Vercel ships them with the serverless functions.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*", "./content/**/*"],
  },
};

export default nextConfig;
