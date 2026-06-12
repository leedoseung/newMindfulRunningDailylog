import { render, screen } from '@testing-library/react'
import { ChallengeFeed } from '@/presentation/components/mission/challenge-feed'

describe('ChallengeFeed', () => {
  it('renders feed items', () => {
    render(
      <ChallengeFeed initialItems={[
        { id: 'l1', memberId: 'm1', memberName: '두승', memberAvatarUrl: '', logDate: '2026-08-15', dayIndex: 45, count: 100, completed: true },
      ]} />
    )
    expect(screen.getByText('두승')).toBeInTheDocument()
    expect(screen.getByText(/46일/)).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(<ChallengeFeed initialItems={[]} />)
    expect(screen.getByText(/아직 활동/)).toBeInTheDocument()
  })
})
