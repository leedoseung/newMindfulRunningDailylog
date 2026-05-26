import { render, screen } from '@testing-library/react'
import { RunCard } from '@/presentation/components/feed/run-card'
import type { RunLog } from '@/domain/entities/run-log'

const makeRun = (overrides: Partial<RunLog> = {}): RunLog => ({
  id: 'r1',
  memberId: 'm1',
  memberName: '이두승',
  date: '2026-05-24',
  durationMin: 45,
  title: '남산 달리기',
  thoughtBefore: '가볍게 달릴 예정',
  thoughtDuring: '생각보다 좋다',
  thoughtAfter: '뿌듯하다',
  location: '남산',
  photoUrl: '',
  createdAt: '2026-05-24T09:00:00Z',
  ...overrides,
})

describe('RunCard', () => {
  it('renders member name and duration', () => {
    render(<RunCard run={makeRun()} onClick={() => {}} />)
    expect(screen.getByText('이두승')).toBeInTheDocument()
    expect(screen.getByText('45분')).toBeInTheDocument()
  })

  it('renders photo background when photoUrl is present', () => {
    const run = makeRun({ photoUrl: 'https://example.com/photo.jpg' })
    const { container } = render(<RunCard run={run} onClick={() => {}} />)
    const card = container.firstChild as HTMLElement
    expect(card.style.backgroundImage).toContain('example.com/photo.jpg')
  })

  it('renders title text', () => {
    render(<RunCard run={makeRun()} onClick={() => {}} />)
    expect(screen.getByText('남산 달리기')).toBeInTheDocument()
  })
})
