import { render, screen } from '@testing-library/react'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
}))

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 4,
  completedAt: null, failedAt: null,
}

const makeCells = (): MissionDayCell[] =>
  Array.from({ length: 100 }, (_, i) => ({
    dayIndex: i, date: `2026-07-${String(i + 1).padStart(2, '0')}`,
    state: i < 5 ? 'done' : i === 5 ? 'today' : 'future',
    count: i < 5 ? 100 : 0, usedPass: false,
  }))

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

describe('MissionPageClient', () => {
  it('renders board + header + counter when enrolled with board data', () => {
    render(
      <MissionPageClient
        mode="enrolled"
        challenge={challenge}
        participation={participation}
        board={{
          cells: makeCells(), streak: 5, completedDays: 5,
          passesRemaining: 4, todayIndex: 5, challengeId: 'c1',
        }}
      />
    )
    expect(screen.getByText('Day 6')).toBeInTheDocument()
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0)
  })

  it('renders enroll card when not enrolled and upcoming challenge exists', () => {
    render(
      <MissionPageClient
        mode="not-enrolled"
        challenge={challenge}
      />
    )
    expect(screen.getByText('참가 신청')).toBeInTheDocument()
  })

  it('renders no-active state when no challenge', () => {
    render(<MissionPageClient mode="no-challenge" />)
    expect(screen.getByText(/진행 중인|곧/)).toBeInTheDocument()
  })
})
