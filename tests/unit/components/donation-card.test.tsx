import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DonationCard } from '@/presentation/components/profile/donation-card'
import type { RunLog } from '@/domain/entities/run-log'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const fetchMock = vi.fn()
global.fetch = fetchMock

// Fix the current date so month calculations are deterministic
const FIXED_DATE = new Date('2026-06-15T12:00:00Z')
vi.setSystemTime(FIXED_DATE)

const makeRun = (overrides: Partial<RunLog> = {}): RunLog => ({
  id: 'r1', memberId: 'm1', memberName: '이두승', memberAvatarUrl: '',
  memberInstaId: '', date: '2026-05-15', durationMin: 30,
  title: '', thoughtBefore: '', thoughtDuring: '', thoughtAfter: '',
  location: '', photoUrl: '', createdAt: '2026-05-15T00:00:00Z',
  likeCount: 0, commentCount: 0,
  ...overrides,
})

const mockDonors = [
  { id: 'd1', memberId: 'm2', memberName: '김민지', memberAvatarUrl: '', yearMonth: '2026-05', durationMin: 60, amount: 60000, createdAt: '2026-06-01T00:00:00Z' },
]

describe('DonationCard', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ donations: mockDonors }) })
  })

  it('renders section header', () => {
    render(<DonationCard allRuns={[]} />)
    expect(screen.getByText(/달리기 기부 마일리지/)).toBeInTheDocument()
  })

  it('defaults to previous month (2026-05 when current is 2026-06)', () => {
    render(<DonationCard allRuns={[]} />)
    expect(screen.getByText('2026년 5월')).toBeInTheDocument()
  })

  it('calculates amount from allRuns for selected month', () => {
    // 75분 = 1시간 → 1,000원 (시간 × 1000)
    const runs = [makeRun({ durationMin: 45 }), makeRun({ durationMin: 30 })]
    render(<DonationCard allRuns={runs} />)
    expect(screen.getByText('1')).toBeInTheDocument()       // 시간
    expect(screen.getByText('1,000')).toBeInTheDocument()   // 원
  })

  it('shows empty state when no runs for selected month', () => {
    render(<DonationCard allRuns={[]} />)
    // wait for fetch to complete so empty state renders
    expect(screen.getByText(/이 달은 달린 기록이 없어요/)).toBeInTheDocument()
  })

  it('fetches donors on mount for the default month', async () => {
    render(<DonationCard allRuns={[]} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/donations?month=2026-05'))
  })

  it('renders donor names from API response', async () => {
    render(<DonationCard allRuns={[]} />)
    await waitFor(() => expect(screen.getByText('김민지')).toBeInTheDocument())
  })

  it('shows 기부했어요 button when memberId provided and has runs', () => {
    const runs = [makeRun({ durationMin: 45 })]
    render(<DonationCard allRuns={runs} memberId="m1" />)
    expect(screen.getByRole('button', { name: /기부했어요/ })).toBeInTheDocument()
  })

  it('shows 이미 기부하셨어요 when current member is in donors list', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({
      donations: [{ ...mockDonors[0], memberId: 'm1' }]
    })})
    const runs = [makeRun({ durationMin: 45 })]
    render(<DonationCard allRuns={runs} memberId="m1" />)
    await waitFor(() => expect(screen.getByText(/이미 기부하셨어요/)).toBeInTheDocument())
  })

  it('calls POST /api/donations on 기부했어요 click', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ donations: [] }) }) // GET for donors
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'd2', memberId: 'm1', memberName: '이두승', memberAvatarUrl: '', yearMonth: '2026-05', durationMin: 45, amount: 45000, createdAt: '2026-06-01T00:00:00Z' }) }) // POST
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ donations: [] }) }) // subsequent GETs

    const runs = [makeRun({ durationMin: 45 })]
    render(<DonationCard allRuns={runs} memberId="m1" />)
    await waitFor(() => screen.getByRole('button', { name: /기부했어요/ }))
    await userEvent.click(screen.getByRole('button', { name: /기부했어요/ }))
    expect(fetchMock).toHaveBeenCalledWith('/api/donations', expect.objectContaining({ method: 'POST' }))
  })

  it('navigates to previous month on ← click', async () => {
    render(<DonationCard allRuns={[]} />)
    const prevBtn = screen.getByRole('button', { name: '←' })
    await userEvent.click(prevBtn)
    expect(screen.getByText('2026년 4월')).toBeInTheDocument()
  })
})
