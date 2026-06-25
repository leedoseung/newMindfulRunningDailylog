import type { NextConfig } from "next";

const IMMUTABLE_YEAR = 'public, max-age=31536000, immutable'
const ICON_CACHE = 'public, max-age=86400, stale-while-revalidate=604800'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE_YEAR }],
      },
      {
        source: '/audio/:path*',
        headers: [{ key: 'Cache-Control', value: IMMUTABLE_YEAR }],
      },
      {
        source: '/icon-:size.png',
        headers: [{ key: 'Cache-Control', value: ICON_CACHE }],
      },
      {
        source: '/apple-touch-icon.png',
        headers: [{ key: 'Cache-Control', value: ICON_CACHE }],
      },
    ]
  },
};

export default nextConfig;
