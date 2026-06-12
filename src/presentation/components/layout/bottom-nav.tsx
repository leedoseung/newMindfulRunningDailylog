'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" fill={active ? 'currentColor' : 'none'} />
      <path d="M9 21V12h6v9" stroke={active ? '#fff' : 'currentColor'} />
    </svg>
  )
}

function IconPen({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor" />
    </svg>
  )
}

function IconTrophy({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H3.5a2.5 2.5 0 0 0 0 5H6" />
      <path d="M18 9h2.5a2.5 2.5 0 0 1 0 5H18" />
      <path d="M6 3h12v10a6 6 0 0 1-12 0V3z" fill={active ? 'currentColor' : 'none'} />
      <path d="M12 19v2" />
      <path d="M8 21h8" />
    </svg>
  )
}

function IconStamp({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="11" r="6" fill={active ? 'currentColor' : 'none'} />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  )
}

function IconPerson({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/home',        Icon: IconHome,   label: '홈' },
  { href: '/',            Icon: IconPen,    label: '기록' },
  { href: '/mission',     Icon: IconStamp,  label: '미션' },
  { href: '/leaderboard', Icon: IconTrophy, label: '리더보드' },
  { href: '/profile',     Icon: IconPerson, label: '프로필' },
]

const HIDDEN_PATHS = ['/login', '/link-member', '/auth']

export function BottomNav() {
  const pathname = usePathname()
  const [navBarKey, setNavBarKey] = useState(0)
  const [navigating, setNavigating] = useState(false)
  const [scrollHidden, setScrollHidden] = useState(false)
  const prevPathRef = useRef(pathname)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname
      setNavigating(false)
    }
  }, [pathname])

  useEffect(() => {
    function onScroll() {
      setScrollHidden(true)
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => setScrollHidden(false), 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(scrollTimerRef.current)
    }
  }, [])

  function startNav(href: string) {
    const isActive = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
    if (!isActive) {
      setNavigating(true)
      setNavBarKey(k => k + 1)
    }
  }

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

  return (
    <>
      {/* 상단 progress bar */}
      <div
        key={navBarKey}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 2, zIndex: 9998,
          background: '#111',
          opacity: navigating ? 1 : 0,
          transition: navigating ? 'none' : 'opacity 0.3s ease',
          animation: navigating ? 'nav-progress 1.4s cubic-bezier(0.1,0.5,0.5,1) forwards' : 'none',
        }}
      />
    <nav style={{
      position: 'fixed', bottom: 20, left: '50%',
      transform: scrollHidden ? 'translateX(-50%) translateY(80px)' : 'translateX(-50%)',
      opacity: scrollHidden ? 0 : 1,
      transition: scrollHidden
        ? 'transform 0.25s cubic-bezier(0.4,0,1,1), opacity 0.2s ease'
        : 'transform 0.35s cubic-bezier(0,0,0.2,1), opacity 0.3s ease',
      zIndex: 100,
      display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: 32,
      padding: '8px 10px',
      gap: 4,
      boxShadow: '0 4px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.6)',
    }}>
      {NAV_ITEMS.map(({ href, Icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={() => startNav(href)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3,
              width: 'clamp(48px, calc((100vw - 56px) / 5), 62px)',
              height: 52,
              borderRadius: 22,
              background: active ? '#111111' : 'transparent',
              color: active ? '#ffffff' : '#aaaaaa',
              textDecoration: 'none',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            <Icon active={active} />
            <span style={{
              fontFamily: FONT,
              fontSize: '0.45rem',
              fontWeight: active ? 600 : 400,
              letterSpacing: '0.3px',
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
    </>
  )
}
