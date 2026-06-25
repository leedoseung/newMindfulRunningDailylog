import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/presentation/components/layout/bottom-nav'
import { PageTransition } from '@/presentation/components/layout/page-transition'
import { SWRegistrar } from '@/presentation/components/layout/sw-registrar'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: '마인드풀러닝',
  description: '함께 달리는 마음챙김 러닝 기록',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '마인드풀러닝',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preload"
          href="/fonts/PretendardVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body style={{ paddingBottom: '80px' }}>
        <SWRegistrar />
        <PageTransition>{children}</PageTransition>
        <BottomNav />
      </body>
    </html>
  )
}
