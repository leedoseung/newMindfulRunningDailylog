'use client'

import type { CSSProperties, ReactNode } from 'react'

type Props = {
  label: string
  bg: CSSProperties['background']
  children: ReactNode
  textColor?: string
}

export function CardShell({ label, bg, children, textColor = '#fff' }: Props) {
  return (
    <section
      role="region"
      aria-label={label}
      style={{
        width: '100vw',
        height: '100dvh',
        background: bg,
        color: textColor,
        padding:
          'env(safe-area-inset-top) 24px env(safe-area-inset-bottom) 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily:
          "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
        letterSpacing: '-0.01em',
        overflow: 'hidden',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </section>
  )
}
