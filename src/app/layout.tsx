// src/app/layout.tsx
import type { Metadata } from 'next'
import { Raleway, Roboto } from 'next/font/google'
import './globals.css'

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-raleway',
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  title: '마인드풀러닝',
  description: '함께 달리는 마음챙김 러닝 기록',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${raleway.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  )
}
