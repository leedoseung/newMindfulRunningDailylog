'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',            icon: '⊞',  label: '홈' },
  { href: '/record',      icon: '✏️', label: '기록' },
  { href: '/leaderboard', icon: '↑',  label: '리더보드' },
  { href: '/profile',     icon: '○',  label: '프로필' },
]

const HIDDEN_PATHS = ['/login', '/link-member', '/auth']

export function BottomNav() {
  const pathname = usePathname()

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

  const showFab = !['/record', '/login', '/link-member'].some(p => pathname.startsWith(p))

  return (
    <>
      {showFab && (
        <Link
          href="/record"
          style={{
            position: 'fixed', bottom: '78px', right: '20px',
            width: '50px', height: '50px', borderRadius: '50%',
            background: '#111111', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(46,145,252,0.4)',
            zIndex: 101,
          }}
        >+</Link>
      )}

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(244,245,246,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', justifyContent: 'space-around',
        padding: '12px 0 28px', zIndex: 100,
      }}>
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                fontSize: '0.57rem', fontWeight: 500,
                color: active ? '#111111' : '#C0C0C0',
                textDecoration: 'none', transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
