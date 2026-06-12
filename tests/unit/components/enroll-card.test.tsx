import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { EnrollCard } from '@/presentation/components/mission/enroll-card'

describe('EnrollCard', () => {
  it('renders title, start date, and enroll button', () => {
    render(
      <EnrollCard
        title="런지 100일 챌린지"
        description="매일 100개"
        startDate="2026-07-01"
        registrationDeadline="2026-07-04"
        onEnroll={() => {}}
      />
    )
    expect(screen.getByText('런지 100일 챌린지')).toBeInTheDocument()
    expect(screen.getByText(/2026-07-01/)).toBeInTheDocument()
    expect(screen.getByText('참가 신청')).toBeInTheDocument()
  })

  it('calls onEnroll when button clicked', () => {
    const onEnroll = vi.fn()
    render(
      <EnrollCard
        title="t" description="" startDate="2026-07-01"
        registrationDeadline="2026-07-04" onEnroll={onEnroll}
      />
    )
    fireEvent.click(screen.getByText('참가 신청'))
    expect(onEnroll).toHaveBeenCalledTimes(1)
  })

  it('disables button when isPending', () => {
    const onEnroll = vi.fn()
    render(
      <EnrollCard
        title="t" description="" startDate="2026-07-01"
        registrationDeadline="2026-07-04" onEnroll={onEnroll} isPending
      />
    )
    fireEvent.click(screen.getByText(/처리|참가/))
    expect(onEnroll).not.toHaveBeenCalled()
  })
})
