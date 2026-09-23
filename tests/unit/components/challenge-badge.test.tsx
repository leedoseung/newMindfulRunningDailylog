import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ChallengeBadge, type Badge } from '@/presentation/components/profile/challenge-badge'

function badge(over: Partial<Badge> = {}): Badge {
  return {
    challenge_id: 'c1',
    challenge_title: '런지 100일 시즌1',
    completed_at: '2026-09-22T10:00:00Z',
    achievements: ['finisher'],
    ...over,
  }
}

describe('ChallengeBadge', () => {
  it('renders nothing when the list is empty', () => {
    const { container } = render(<ChallengeBadge badges={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders finisher achievement label', () => {
    const { getByText } = render(<ChallengeBadge badges={[badge()]} />)
    expect(getByText('100일 완주자')).toBeTruthy()
  })

  it('renders every provided achievement in catalog order', () => {
    const { container } = render(
      <ChallengeBadge
        badges={[
          badge({
            achievements: ['streak_90', 'perfect_100', 'finisher', 'no_pass'],
          }),
        ]}
      />,
    )
    const chipList = container.querySelectorAll('ul ul li')
    const labels = Array.from(chipList).map(c => c.textContent ?? '')
    // Catalog order: finisher, perfect_100, no_pass, streak_90, streak_60, streak_30, ...
    expect(labels[0]).toContain('100일 완주자')
    expect(labels[1]).toContain('Perfect 100')
    expect(labels[2]).toContain('패스 없이')
    expect(labels[3]).toContain('90일 연속')
  })

  it('renders stats when provided', () => {
    const { getByText } = render(
      <ChallengeBadge
        badges={[
          badge({
            stats: { total_reps: 8800, max_streak: 100, rest_days: 12 },
          }),
        ]}
      />,
    )
    expect(getByText(/총 런지 8,800회/)).toBeTruthy()
    expect(getByText(/최장 연속 100일/)).toBeTruthy()
    expect(getByText(/쉬어간 12일/)).toBeTruthy()
  })

  it('falls back to finisher when achievements are missing (legacy badge)', () => {
    const { getByText } = render(
      <ChallengeBadge
        badges={[
          badge({ achievements: undefined }),
        ]}
      />,
    )
    expect(getByText('100일 완주자')).toBeTruthy()
  })
})
