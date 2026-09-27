import type { NextConfig } from "next"

// Keep in sync with BASE_PATH in lib/site.ts (enforced by tests/site.test.ts)
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/personal-cookbook",
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
