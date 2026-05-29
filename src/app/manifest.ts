import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '마인드풀러닝',
    short_name: '마인드풀러닝',
    description: '함께 달리는 마음챙김 러닝 기록',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F7F5',
    theme_color: '#111111',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
