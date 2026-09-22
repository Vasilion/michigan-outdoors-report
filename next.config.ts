import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  turbopack: { root: import.meta.dirname },
  typedRoutes: false,
};

export default nextConfig;
