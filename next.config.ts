import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // swisseph and tz-lookup are native/CJS modules — must not be bundled
  serverExternalPackages: ["swisseph", "tz-lookup"],
};

export default nextConfig;
