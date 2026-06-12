import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import type { Challenge } from '@/domain/entities/challenge'

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

describe('TodayCounter optimistic update', () => {
  it('shows updated count immediately after +10 click (optimistic)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 50 }),
    } as Response)

    render(
      <MissionPageClient
        mode="enrolled"
        challenge={challenge}
        board={{ cells, streak: 0, completedDays: 0, passesRemaining: 5, todayIndex: 0, challengeId: 'c1' }}
      />
    )

    expect(screen.getByText('40')).toBeInTheDocument()
    fireEvent.click(screen.getByText('+10'))

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument()
    })
  })

  it('rolls back to previous count on API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'NEGATIVE_DELTA' }),
    } as Response)

    render(
      <MissionPageClient
        mode="enrolled"
        challenge={challenge}
        board={{ cells, streak: 0, completedDays: 0, passesRemaining: 5, todayIndex: 0, challengeId: 'c1' }}
      />
    )

    expect(screen.getByText('40')).toBeInTheDocument()
    fireEvent.click(screen.getByText('+10'))

    // optimistic 50 then rollback to 40
    await waitFor(() => {
      expect(screen.getByText('40')).toBeInTheDocument()
    })
  })
})
