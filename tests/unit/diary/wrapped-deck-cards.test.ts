import { describe, it, expect } from 'vitest'
import { buildCardSequence } from '@/domain/diary/card-sequence'

const base = {
  totalRuns: 0,
  totalMinutes: 0,
  maxStreak: 0,
  streakLastDows: [],
  longestRun: null,
  voicePool: [],
  albumPhotos: [],
  albumOverflowCount: 0,
  weekdayCounts: [0, 0, 0, 0, 0, 0, 0],
  topWeekday: null,
  runDates: [],
  title: { key: 'starter' as const, label: '쉬어가는 달', subtitle: '다음 달, 다시 시작해요' },
}

describe('buildCardSequence', () => {
  it('returns 3-card sequence for empty month', () => {
    expect(buildCardSequence(base)).toEqual(['intro', 'rest', 'share'])
  })

  it('skips streak when runs < 3', () => {
    const s = { ...base, totalRuns: 2, longestRun: { id: 'a' } as never }
    expect(buildCardSequence(s)).not.toContain('streak')
  })

  it('includes streak when runs >= 3, even with maxStreak=1 (spec §5: threshold is totalRuns, not maxStreak)', () => {
    const s = { ...base, totalRuns: 3, maxStreak: 1, longestRun: { id: 'a' } as never }
    expect(buildCardSequence(s)).toContain('streak')
  })

  it('skips voice when voicePool empty', () => {
    const s = { ...base, totalRuns: 5, longestRun: { id: 'a' } as never }
    expect(buildCardSequence(s)).not.toContain('voice')
  })

  it('skips album when no photos', () => {
    const s = { ...base, totalRuns: 5, longestRun: { id: 'a' } as never, albumPhotos: [] }
    expect(buildCardSequence(s)).not.toContain('album')
  })

  it('full sequence when all data present', () => {
    const s = {
      ...base,
      totalRuns: 10,
      totalMinutes: 300,
      maxStreak: 4,
      streakLastDows: ['월', '화', '수', '목'],
      longestRun: { id: 'a' } as never,
      voicePool: [{ id: 'b' } as never],
      albumPhotos: [{ runId: 'a', photoUrl: 'p', date: '2026-06-01' }],
      albumOverflowCount: 0,
      weekdayCounts: [1, 2, 2, 1, 1, 2, 1],
      topWeekday: { dow: 1, label: '월', count: 2 },
      runDates: ['2026-06-01'],
      title: { key: 'consistent' as const, label: '꾸준한 페이스메이커', subtitle: '10번 달린 한 달' },
    }
    expect(buildCardSequence(s)).toEqual([
      'intro',
      'total',
      'heatmap',
      'streak',
      'weekday',
      'longest',
      'voice',
      'album',
      'title',
      'share',
    ])
  })
})
