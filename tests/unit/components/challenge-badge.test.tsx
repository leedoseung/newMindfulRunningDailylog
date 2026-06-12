import { render, screen } from '@testing-library/react'
import { ChallengeBadge } from '@/presentation/components/profile/challenge-badge'

describe('ChallengeBadge', () => {
  it('renders badge title + date', () => {
    render(
      <ChallengeBadge
        badges={[{ challenge_id: 'c1', challenge_title: '런지 100일', completed_at: '2026-10-09T00:00:00Z' }]}
      />
    )
    expect(screen.getByText('런지 100일')).toBeInTheDocument()
    expect(screen.getByText('2026-10-09')).toBeInTheDocument()
  })

  it('renders nothing when empty', () => {
    const { container } = render(<ChallengeBadge badges={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
