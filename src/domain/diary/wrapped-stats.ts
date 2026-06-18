// src/domain/diary/wrapped-stats.ts
import type { RunLog } from '@/domain/entities/run-log'

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']

export type WrappedStats = {
  totalRuns: number
  totalMinutes: number
  maxStreak: number
  streakLastDows: string[]
  longestRun: RunLog | null
  voicePool: RunLog[]
  albumPhotos: { runId: string; photoUrl: string; date: string }[]
  albumOverflowCount: number
}

function computeMaxStreak(uniqueDates: string[]): { len: number; endDate: string | null } {
  if (uniqueDates.length === 0) return { len: 0, endDate: null }
  const sorted = [...uniqueDates].sort()
  let best = 1, cur = 1, bestEnd = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`)
    const curD = new Date(`${sorted[i]}T00:00:00`)
    const diffDays = Math.round((curD.getTime() - prev.getTime()) / 86400000)
    if (diffDays === 1) cur++
    else cur = 1
    if (cur > best) { best = cur; bestEnd = sorted[i] }
  }
  return { len: best, endDate: bestEnd }
}

function lastStreakDows(endDate: string, len: number): string[] {
  const take = Math.min(len, 5)
  const out: string[] = []
  const end = new Date(`${endDate}T00:00:00`)
  for (let i = take - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000)
    out.push(DOW_KO[d.getDay()])
  }
  return out
}

export function computeWrappedStats(runs: RunLog[]): WrappedStats {
  if (runs.length === 0) {
    return {
      totalRuns: 0, totalMinutes: 0, maxStreak: 0, streakLastDows: [],
      longestRun: null, voicePool: [], albumPhotos: [], albumOverflowCount: 0,
    }
  }

  const totalMinutes = runs.reduce((acc, r) => acc + r.durationMin, 0)
  const uniqueDates = Array.from(new Set(runs.map(r => r.date)))
  const { len, endDate } = computeMaxStreak(uniqueDates)
  const streakLastDows = endDate ? lastStreakDows(endDate, len) : []

  const longestRun = runs.reduce<RunLog | null>(
    (best, r) => (best == null || r.durationMin > best.durationMin ? r : best),
    null,
  )

  const voicePool = runs.filter(r => r.thoughtAfter.trim().length > 0)

  const withPhoto = runs
    .filter(r => r.photoUrl)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const albumPhotos = withPhoto.slice(0, 9).map(r => ({ runId: r.id, photoUrl: r.photoUrl, date: r.date }))
  const albumOverflowCount = Math.max(0, withPhoto.length - 9)

  return {
    totalRuns: runs.length,
    totalMinutes,
    maxStreak: len,
    streakLastDows,
    longestRun,
    voicePool,
    albumPhotos,
    albumOverflowCount,
  }
}
