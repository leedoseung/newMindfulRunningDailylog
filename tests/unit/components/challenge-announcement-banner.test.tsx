import { render, screen } from '@testing-library/react'
import { ChallengeAnnouncementBanner } from '@/presentation/components/home/challenge-announcement-banner'

describe('ChallengeAnnouncementBanner', () => {
  it('renders upcoming challenge with D-day', () => {
    render(
      <ChallengeAnnouncementBanner
        challenge={{
          id: 'c1', title: '런지 100일 시즌1',
          description: '매일 100개',
          startDate: '2026-07-01',
          registrationDeadline: '2026-07-04',
        }}
        today="2026-06-25"
        enrolled={false}
      />
    )
    expect(screen.getByText(/런지 100일 시즌1/)).toBeInTheDocument()
    expect(screen.getByText(/D-6/)).toBeInTheDocument()
    expect(screen.getByText(/참가 신청/)).toBeInTheDocument()
  })

  it('renders enrolled state', () => {
    render(
      <ChallengeAnnouncementBanner
        challenge={{
          id: 'c1', title: '런지 100일 시즌1',
          description: '', startDate: '2026-07-01', registrationDeadline: '2026-07-04',
        }}
        today="2026-06-25"
        enrolled
      />
    )
    expect(screen.getByText(/참가 중/)).toBeInTheDocument()
  })

  it('renders nothing when challenge is null', () => {
    const { container } = render(
      <ChallengeAnnouncementBanner challenge={null} today="2026-06-25" enrolled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders 오늘 시작 when today == startDate', () => {
    render(
      <ChallengeAnnouncementBanner
        challenge={{
          id: 'c1', title: '시즌1', description: '',
          startDate: '2026-07-01', registrationDeadline: '2026-07-04',
        }}
        today="2026-07-01"
        enrolled={false}
      />
    )
    expect(screen.getByText(/오늘 시작/)).toBeInTheDocument()
  })
})
