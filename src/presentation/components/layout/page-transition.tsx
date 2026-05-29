'use client'

import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} style={{ animation: 'page-enter 0.22s ease-out both' }}>
      {children}
    </div>
  )
}
