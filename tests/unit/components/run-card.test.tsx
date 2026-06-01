import { render, screen } from '@testing-library/react'
import { RunCard } from '@/presentation/components/feed/run-card'
import type { RunLog } from '@/domain/entities/run-log'

const makeRun = (overrides: Partial<RunLog> = {}): RunLog => ({
  id: 'r1',
  memberId: 'm1',
  memberName: '이두승', memberAvatarUrl: '', memberInstaId: '',
  date: '2026-05-24',
  durationMin: 45,
  title: '남산 달리기',
  thoughtBefore: '가볍게 달릴 예정',
  thoughtDuring: '생각보다 좋다',
  thoughtAfter: '뿌듯하다',
  location: '남산',
  photoUrl: '',
  createdAt: '2026-05-24T09:00:00Z',
  likeCount: 0,
  commentCount: 0,
  ...overrides,
})

describe('RunCard', () => {
  it('renders member name and duration', () => {
    render(<RunCard run={makeRun()} cardType="hero" onClick={() => {}} />)
    expect(screen.getByText('이두승')).toBeInTheDocument()
    expect(screen.getAllByText('45')[0]).toBeInTheDocument()
    expect(screen.getAllByText('분')[0]).toBeInTheDocument()
  })

  it('renders photo background image div when photoUrl is present', () => {
    const run = makeRun({ photoUrl: 'https://example.com/photo.jpg' })
    const { container } = render(<RunCard run={run} cardType="photo" onClick={() => {}} />)
    const photoBg = container.querySelector('[style*="example.com/photo.jpg"]')
    expect(photoBg).toBeInTheDocument()
  })

  it('renders title text', () => {
    render(<RunCard run={makeRun()} cardType="white" onClick={() => {}} />)
    expect(screen.getByText(/"남산 달리기"/)).toBeInTheDocument()
  })

  it('renders time-ago label', () => {
    render(<RunCard run={makeRun()} cardType="white" onClick={() => {}} />)
    // date is in the past, so should show X일 전 or 어제/오늘
    expect(screen.getByText(/일 전|어제|오늘/)).toBeInTheDocument()
  })
})
