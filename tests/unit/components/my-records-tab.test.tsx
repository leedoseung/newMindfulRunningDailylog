import { render, screen } from '@testing-library/react'
import { MyRecordsTab } from '@/presentation/components/my-records/my-records-tab'
import type { RunLog } from '@/domain/entities/run-log'
import { vi, describe, it, expect } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const makeRun = (overrides: Partial<RunLog> = {}): RunLog => ({
  id: 'r1', memberId: 'm1', memberName: '이두승', memberAvatarUrl: '',
  date: '2026-05-26', durationMin: 45, title: '남산',
  thoughtBefore: '', thoughtDuring: '', thoughtAfter: '',
  location: '남산', photoUrl: '', createdAt: '2026-05-26T00:00:00Z',
  ...overrides,
})

describe('MyRecordsTab', () => {
  it('shows empty state when no runs', () => {
    render(<MyRecordsTab runs={[]} memberId="m1" />)
    expect(screen.getByText('아직 기록이 없습니다')).toBeInTheDocument()
  })

  it('renders a card for each run', () => {
    const runs = [makeRun({ id: 'r1', title: '아침 달리기' }), makeRun({ id: 'r2', title: '저녁 달리기' })]
    render(<MyRecordsTab runs={runs} memberId="m1" />)
    expect(screen.getByText('아침 달리기')).toBeInTheDocument()
    expect(screen.getByText('저녁 달리기')).toBeInTheDocument()
  })
})
