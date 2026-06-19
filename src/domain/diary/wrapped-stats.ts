// src/domain/diary/wrapped-stats.ts
import type { RunLog } from '@/domain/entities/run-log'

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']

export type TitleKey =
  | 'consistent'   // 꾸준한 페이스메이커
  | 'weekend'      // 주말 워리어
  | 'longDistance' // 장거리 도전자
  | 'earlyBird'    // 새벽 러너
  | 'nightOwl'     // 야간 러너
  | 'starter'      // 시작하는 러너
  | 'comeback'     // 컴백 러너

export type WrappedStats = {
  totalRuns: number
  totalMinutes: number
  maxStreak: number
  streakLastDows: string[]
  longestRun: RunLog | null
  voicePool: RunLog[]
  albumPhotos: { runId: string; photoUrl: string; date: string }[]
  albumOverflowCount: number
  // New: weekday distribution counts indexed 0=Sun..6=Sat
  weekdayCounts: number[]
  topWeekday: { dow: number; label: string; count: number } | null
  // New: dates of runs in YYYY-MM-DD, for heatmap
  runDates: string[]
  // New: derived title key + Korean label
  title: { key: TitleKey; label: string; subtitle: string }
}

function computeMaxStreak(uniqueDates: string[]): { len: number; endDate: string | null } {
  const first = uniqueDates[0]
  if (uniqueDates.length === 0 || first === undefined) return { len: 0, endDate: null }
  const sorted = [...uniqueDates].sort()
  let best = 1, cur = 1, bestEnd: string = sorted[0] ?? first
  for (let i = 1; i < sorted.length; i++) {
    const prevStr = sorted[i - 1]!
    const curStr = sorted[i]!
    const prev = new Date(`${prevStr}T00:00:00`)
    const curD = new Date(`${curStr}T00:00:00`)
    const diffDays = Math.round((curD.getTime() - prev.getTime()) / 86400000)
    if (diffDays === 1) cur++
    else cur = 1
    if (cur > best) { best = cur; bestEnd = curStr }
  }
  return { len: best, endDate: bestEnd }
}

function computeWeekdayCounts(runs: RunLog[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const r of runs) {
    const d = new Date(`${r.date}T00:00:00`)
    const dow = d.getDay()
    if (dow >= 0 && dow <= 6) counts[dow] = (counts[dow] ?? 0) + 1
  }
  return counts
}

function pickTopWeekday(counts: number[]): { dow: number; label: string; count: number } | null {
  let bestDow = -1
  let bestCount = 0
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i] ?? 0
    if (c > bestCount) { bestCount = c; bestDow = i }
  }
  if (bestDow < 0 || bestCount === 0) return null
  return { dow: bestDow, label: DOW_KO[bestDow] ?? '', count: bestCount }
}

function parseHour(runTime: string | null | undefined): number | null {
  if (!runTime) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(runTime)
  if (!m) return null
  const h = Number(m[1])
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : null
}

function computeTitle(
  runs: RunLog[],
  weekdayCounts: number[],
  maxStreak: number,
  longestRun: RunLog | null,
): { key: TitleKey; label: string; subtitle: string } {
  const total = runs.length

  if (total <= 1) {
    return { key: 'starter', label: '시작하는 러너', subtitle: '첫 걸음을 내디뎠어요' }
  }

  const weekendCount = (weekdayCounts[0] ?? 0) + (weekdayCounts[6] ?? 0)
  const weekendShare = weekendCount / total

  const hours = runs.map(r => parseHour(r.runTime)).filter((h): h is number => h !== null)
  const earlyCount = hours.filter(h => h < 7).length
  const nightCount = hours.filter(h => h >= 20).length
  const hourShare = hours.length / total

  const longestMin = longestRun?.durationMin ?? 0
  const avgMin = runs.reduce((s, r) => s + r.durationMin, 0) / total

  if (longestMin >= 90 || avgMin >= 60) {
    return { key: 'longDistance', label: '장거리 도전자', subtitle: `평균 ${Math.round(avgMin)}분, 한계를 넓혔어요` }
  }
  if (hourShare >= 0.5 && earlyCount / total >= 0.5) {
    return { key: 'earlyBird', label: '새벽 러너', subtitle: '아침을 깨우는 사람' }
  }
  if (hourShare >= 0.5 && nightCount / total >= 0.5) {
    return { key: 'nightOwl', label: '야간 러너', subtitle: '하루 끝, 별 보며 달리는 사람' }
  }
  if (weekendShare >= 0.6 && weekendCount >= 2) {
    return { key: 'weekend', label: '주말 워리어', subtitle: '주말마다 어김없이' }
  }
  if (maxStreak >= 5 || total >= 8) {
    return { key: 'consistent', label: '꾸준한 페이스메이커', subtitle: `${total}번 달린 한 달` }
  }
  return { key: 'comeback', label: '돌아온 러너', subtitle: '다시 달리기 시작했어요' }
}

function lastStreakDows(endDate: string, len: number): string[] {
  const take = Math.min(len, 5)
  const out: string[] = []
  const end = new Date(`${endDate}T00:00:00`)
  for (let i = take - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000)
    out.push(DOW_KO[d.getDay()] ?? '')
  }
  return out
}

export function computeWrappedStats(runs: RunLog[]): WrappedStats {
  if (runs.length === 0) {
    return {
      totalRuns: 0, totalMinutes: 0, maxStreak: 0, streakLastDows: [],
      longestRun: null, voicePool: [], albumPhotos: [], albumOverflowCount: 0,
      weekdayCounts: [0, 0, 0, 0, 0, 0, 0],
      topWeekday: null,
      runDates: [],
      title: { key: 'starter', label: '쉬어가는 달', subtitle: '다음 달, 다시 시작해요' },
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
  // R2 egress is free — no real cost cap. Hard limit at 100 as a safety net
  // for the unlikely runner who logs more than 100 photo-bearing runs in a month.
  const ALBUM_CAP = 100
  const albumPhotos = withPhoto.slice(0, ALBUM_CAP).map(r => ({ runId: r.id, photoUrl: r.photoUrl, date: r.date }))
  const albumOverflowCount = Math.max(0, withPhoto.length - ALBUM_CAP)

  const weekdayCounts = computeWeekdayCounts(runs)
  const topWeekday = pickTopWeekday(weekdayCounts)
  const runDates = uniqueDates.slice().sort()
  const title = computeTitle(runs, weekdayCounts, len, longestRun)

  return {
    totalRuns: runs.length,
    totalMinutes,
    maxStreak: len,
    streakLastDows,
    longestRun,
    voicePool,
    albumPhotos,
    albumOverflowCount,
    weekdayCounts,
    topWeekday,
    runDates,
    title,
  }
}
