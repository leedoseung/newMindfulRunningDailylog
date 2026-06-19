'use client'

import { useState, useEffect, useRef, useMemo, useCallback, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import type { WrappedStats } from '@/domain/diary/wrapped-stats'
import type { RunLog } from '@/domain/entities/run-log'
import { buildCardSequence } from '@/domain/diary/card-sequence'
import { IntroCard } from './wrapped-cards/intro-card'
import { TotalCard } from './wrapped-cards/total-card'
import { StreakCard } from './wrapped-cards/streak-card'
import { LongestCard } from './wrapped-cards/longest-card'
import { VoiceCard } from './wrapped-cards/voice-card'
import { AlbumCard } from './wrapped-cards/album-card'
import { ShareCard } from './wrapped-cards/share-card'
import { RestCard } from './wrapped-cards/rest-card'
import { WeekdayCard } from './wrapped-cards/weekday-card'
import { TitleCard } from './wrapped-cards/title-card'
import { HeatmapCard } from './wrapped-cards/heatmap-card'

const AUTO_MS = 4500
// Must match STAGE_INTERVAL_MS in AlbumCard so each photo gets one full beat
const ALBUM_PHOTO_MS = 1800
const ALBUM_MAX_MS = 30000

function durationForCard(card: string | undefined, photoCount: number): number {
  if (card === 'album' && photoCount > 0) {
    // Give every photo at least one stage rotation, plus a 600ms tail.
    return Math.min(ALBUM_MAX_MS, photoCount * ALBUM_PHOTO_MS + 600)
  }
  return AUTO_MS
}

type Props = {
  member: { id: string; name: string }
  year: number
  month: number
  stats: WrappedStats
  shareUrl: string
  allUrl: string
}

export function WrappedDeck({ member, year, month, stats, shareUrl, allUrl }: Props) {
  const cards = useMemo(() => buildCardSequence(stats), [stats])
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [bgmOn, setBgmOn] = useState(false)
  const reduced = useReducedMotion()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Session-stable voice quote — Math.random on mount, never re-runs on replay
  const [voiceQuote] = useState<{ run: RunLog; text: string } | null>(() => {
    if (stats.voicePool.length === 0) return null
    const pick = stats.voicePool[Math.floor(Math.random() * stats.voicePool.length)]
    if (!pick) return null
    return { run: pick, text: pick.thoughtAfter ?? '' }
  })

  // Auto-advance (skip if reduced motion or paused)
  useEffect(() => {
    if (reduced || paused) return
    if (idx >= cards.length - 1) return
    const ms = durationForCard(cards[idx], stats.albumPhotos.length)
    const t = window.setTimeout(() => setIdx(i => Math.min(cards.length - 1, i + 1)), ms)
    return () => window.clearTimeout(t)
  }, [idx, paused, reduced, cards, stats.albumPhotos.length])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setIdx(i => Math.min(cards.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1))
      if (e.key === ' ') {
        e.preventDefault()
        setPaused(p => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cards.length])

  // Tap / swipe handlers
  const touchStart = useRef<{ x: number; t: number } | null>(null)

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0]
    if (!touch) return
    touchStart.current = { x: touch.clientX, t: Date.now() }
    setPaused(true)
  }

  function onTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const s = touchStart.current
    setPaused(false)
    if (!s) return
    const endTouch = e.changedTouches[0]
    if (!endTouch) return
    const dx = endTouch.clientX - s.x
    const dt = Date.now() - s.t
    if (dt > 500 && Math.abs(dx) < 10) return // long-press — no nav
    if (Math.abs(dx) > 40) {
      // swipe
      setIdx(i => (dx > 0 ? Math.max(0, i - 1) : Math.min(cards.length - 1, i + 1)))
    } else {
      // split-tap: left third = back, right = forward
      const w = window.innerWidth
      const tapX = endTouch.clientX
      if (tapX < w / 3) setIdx(i => Math.max(0, i - 1))
      else setIdx(i => Math.min(cards.length - 1, i + 1))
    }
  }

  // BGM control
  useEffect(() => {
    if (!audioRef.current) return
    if (bgmOn) {
      audioRef.current.play().catch(() => setBgmOn(false))
    } else {
      audioRef.current.pause()
    }
  }, [bgmOn])

  const replay = useCallback(() => setIdx(0), [])

  const current = cards[idx]

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ position: 'relative' }}
    >
      <ProgressBars total={cards.length} current={idx} />
      <BgmToggle on={bgmOn} onToggle={() => setBgmOn(v => !v)} />
      <CloseButton />
      {/* Source: "vampire's piano" by Tad Miller, CC0 1.0 — see public/audio/LICENSE.md */}
      <audio ref={audioRef} src="/audio/diary-ambient.m4a" loop preload="none" />

      {current === 'intro' && (
        <IntroCard memberName={member.name} year={year} month={month} />
      )}
      {current === 'total' && (
        <TotalCard totalRuns={stats.totalRuns} totalMinutes={stats.totalMinutes} />
      )}
      {current === 'heatmap' && (
        <HeatmapCard year={year} month={month} runDates={stats.runDates} totalRuns={stats.totalRuns} />
      )}
      {current === 'streak' && (
        <StreakCard maxStreak={stats.maxStreak} streakLastDows={stats.streakLastDows} />
      )}
      {current === 'weekday' && (
        <WeekdayCard weekdayCounts={stats.weekdayCounts} topWeekday={stats.topWeekday} />
      )}
      {current === 'longest' && stats.longestRun && (
        <LongestCard run={stats.longestRun} />
      )}
      {current === 'voice' && voiceQuote && (
        <VoiceCard quote={voiceQuote} />
      )}
      {current === 'album' && (
        <AlbumCard photos={stats.albumPhotos} overflow={stats.albumOverflowCount} />
      )}
      {current === 'title' && (
        <TitleCard title={stats.title} />
      )}
      {current === 'share' && (
        <ShareCard
          year={year}
          month={month}
          shareUrl={shareUrl}
          allUrl={allUrl}
          onReplay={replay}
          memberName={member.name}
        />
      )}
      {current === 'rest' && (
        <RestCard year={year} month={month} />
      )}
    </div>
  )
}

function useReducedMotion(): boolean {
  // Lazy initialiser reads the real value on mount (client only); SSR receives false
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

function ProgressBars({ total, current }: { total: number; current: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuenow={current + 1}
      aria-valuemax={total}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 10px)',
        left: 12,
        right: 12,
        display: 'flex',
        gap: 4,
        zIndex: 10,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i <= current ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </div>
  )
}

function CloseButton() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])
  if (!mounted) return null

  const node = (
    <button
      type="button"
      onClick={() => { window.location.href = '/home' }}
      aria-label="홈으로 닫기"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 12px)',
        right: 12,
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 999,
        width: 44,
        height: 44,
        display: 'grid',
        placeItems: 'center',
        fontSize: '1.1rem',
        cursor: 'pointer',
        zIndex: 2147483646,
        fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
        lineHeight: 1,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
      }}
    >
      ✕
    </button>
  )
  return createPortal(node, document.body)
}

function BgmToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label="배경 음악"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        left: 12,
        background: 'rgba(0,0,0,0.4)',
        color: '#fff',
        border: 'none',
        borderRadius: 999,
        width: 44,
        height: 44,
        fontSize: '1rem',
        cursor: 'pointer',
        zIndex: 10,
        fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
      }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  )
}
