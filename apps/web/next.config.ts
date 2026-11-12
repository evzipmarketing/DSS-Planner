import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dss/core", "@dss/data"],
  poweredByHeader: false,
};

export default nextConfig;
