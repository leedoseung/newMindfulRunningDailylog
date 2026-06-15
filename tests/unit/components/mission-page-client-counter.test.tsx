import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
  completedAt: null, failedAt: null,
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const challenge: Challenge = {
  id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
  startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

const cells: MissionDayCell[] = Array.from({ length: 100 }, (_, i) => ({
  dayIndex: i, date: `2026-07-${String(i + 1).padStart(2, '0')}`,
  state: i === 0 ? 'today' : 'future',
  count: i === 0 ? 40 : 0, usedPass: false,
}))

function setDelta(value: string) {
  fireEvent.change(screen.getByLabelText('이번에 추가할 횟수'), { target: { value } })
}

describe('TodayCounter delta optimistic update', () => {
  it('shows cumulative count immediately after add (optimistic)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 70 }),
    } as Response)

    render(
      <MissionPageClient
        mode="enrolled"
        challenge={challenge}
        participation={participation}
        board={{ cells, streak: 0, completedDays: 0, passesRemaining: 5, todayIndex: 0, challengeId: 'c1' }}
      />
    )

    expect(screen.getByText('40')).toBeInTheDocument()
    setDelta('30')
    fireEvent.click(screen.getByText('저장'))

    await waitFor(() => {
      expect(screen.getByText('70')).toBeInTheDocument()
    })
  })

  it('rolls back on API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'BEFORE_START' }),
    } as Response)

    render(
      <MissionPageClient
        mode="enrolled"
        challenge={challenge}
        participation={participation}
        board={{ cells, streak: 0, completedDays: 0, passesRemaining: 5, todayIndex: 0, challengeId: 'c1' }}
      />
    )

    expect(screen.getByText('40')).toBeInTheDocument()
    setDelta('30')
    fireEvent.click(screen.getByText('저장'))

    await waitFor(() => {
      expect(screen.getByText('40')).toBeInTheDocument()
    })
  })
})
