// tests/unit/diary/wrapped-stats.test.ts
import { describe, it, expect } from 'vitest'
import { computeWrappedStats } from '@/domain/diary/wrapped-stats'
import type { RunLog } from '@/domain/entities/run-log'

function mk(over: Partial<RunLog>): RunLog {
  return {
    id: 'r', memberId: 'm', memberName: 'd', memberAvatarUrl: '', memberInstaId: '',
    date: '2026-06-01', runTime: null, durationMin: 30, title: 't',
    thoughtBefore: '', thoughtDuring: '', thoughtAfter: '',
    location: '', photoUrl: '', rawPhotoUrl: null, createdAt: '',
    likeCount: 0, commentCount: 0, ...over,
  }
}

describe('computeWrappedStats', () => {
  it('returns zero stats for empty runs', () => {
    const s = computeWrappedStats([])
    expect(s.totalRuns).toBe(0)
    expect(s.totalMinutes).toBe(0)
    expect(s.maxStreak).toBe(0)
    expect(s.streakLastDows).toEqual([])
    expect(s.longestRun).toBeNull()
    expect(s.voicePool).toEqual([])
    expect(s.albumPhotos).toEqual([])
    expect(s.albumOverflowCount).toBe(0)
  })

  it('sums runs and minutes', () => {
    const s = computeWrappedStats([mk({ durationMin: 30 }), mk({ id: 'r2', date: '2026-06-02', durationMin: 45 })])
    expect(s.totalRuns).toBe(2)
    expect(s.totalMinutes).toBe(75)
  })

  it('computes max streak across gaps', () => {
    const runs = [
      mk({ id: 'a', date: '2026-06-01' }),
      mk({ id: 'b', date: '2026-06-02' }),
      mk({ id: 'c', date: '2026-06-03' }),
      // gap
      mk({ id: 'd', date: '2026-06-06' }),
      mk({ id: 'e', date: '2026-06-07' }),
    ]
    const s = computeWrappedStats(runs)
    expect(s.maxStreak).toBe(3)
    expect(s.streakLastDows.length).toBeLessThanOrEqual(5)
    expect(s.streakLastDows[s.streakLastDows.length - 1]).toBe('수') // 2026-06-03 Wed
  })

  it('streakLastDows caps at 5 for streaks longer than 5', () => {
    const runs = Array.from({ length: 7 }, (_, i) =>
      mk({ id: `r${i}`, date: `2026-06-${String(i + 1).padStart(2, '0')}` })
    )
    const s = computeWrappedStats(runs)
    expect(s.maxStreak).toBe(7)
    expect(s.streakLastDows.length).toBe(5)
  })

  it('dedupes same date when computing streak', () => {
    const runs = [
      mk({ id: 'a', date: '2026-06-01' }),
      mk({ id: 'b', date: '2026-06-01', durationMin: 20 }), // same day twice
      mk({ id: 'c', date: '2026-06-02' }),
    ]
    expect(computeWrappedStats(runs).maxStreak).toBe(2)
  })

  it('picks longest run by durationMin', () => {
    const runs = [mk({ id: 'a', durationMin: 30 }), mk({ id: 'b', durationMin: 72 }), mk({ id: 'c', durationMin: 45 })]
    expect(computeWrappedStats(runs).longestRun?.id).toBe('b')
  })

  it('voicePool contains only runs with thoughtAfter', () => {
    const runs = [
      mk({ id: 'a', thoughtAfter: 'great' }),
      mk({ id: 'b', thoughtAfter: '' }),
      mk({ id: 'c', thoughtAfter: 'tough' }),
    ]
    const pool = computeWrappedStats(runs).voicePool
    expect(pool.map(r => r.id).sort()).toEqual(['a', 'c'])
  })

  it('albumPhotos returns newest-first, full set when within cap, no overflow', () => {
    const runs = Array.from({ length: 12 }, (_, i) =>
      mk({ id: `r${i}`, date: `2026-06-${String(i + 1).padStart(2, '0')}`, photoUrl: `p${i}.jpg` })
    )
    runs.push(mk({ id: 'nophoto', date: '2026-06-13', photoUrl: '' }))
    const s = computeWrappedStats(runs)
    expect(s.albumPhotos.length).toBe(12)
    expect(s.albumPhotos[0]?.date).toBe('2026-06-12') // newest with photo
    expect(s.albumOverflowCount).toBe(0)
  })

  it('albumPhotos applies the 100-photo safety cap with overflow count', () => {
    // 101 photo-bearing runs over distinct dates — exceeds the cap by 1.
    // Use a Date object so we don't depend on month boundaries.
    const runs = Array.from({ length: 101 }, (_, i) => {
      const d = new Date(2026, 5, 1)
      d.setDate(d.getDate() + i)
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return mk({ id: `r${i}`, date, photoUrl: `p${i}.jpg` })
    })
    const s = computeWrappedStats(runs)
    expect(s.albumPhotos.length).toBe(100)
    expect(s.albumOverflowCount).toBe(1)
  })
})
