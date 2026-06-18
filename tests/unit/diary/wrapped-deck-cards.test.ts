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

  it('full 7-card sequence when all data present', () => {
    const s = {
      totalRuns: 10,
      totalMinutes: 300,
      maxStreak: 4,
      streakLastDows: ['월', '화', '수', '목'],
      longestRun: { id: 'a' } as never,
      voicePool: [{ id: 'b' } as never],
      albumPhotos: [{ runId: 'a', photoUrl: 'p', date: '2026-06-01' }],
      albumOverflowCount: 0,
    }
    expect(buildCardSequence(s)).toEqual([
      'intro',
      'total',
      'streak',
      'longest',
      'voice',
      'album',
      'share',
    ])
  })
})
