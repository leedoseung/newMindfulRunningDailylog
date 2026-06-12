import { render, screen } from '@testing-library/react'
import { NoActiveChallenge } from '@/presentation/components/mission/no-active-challenge'

describe('NoActiveChallenge', () => {
  it('renders empty-state message', () => {
    render(<NoActiveChallenge />)
    expect(screen.getByText(/진행 중인 챌린지가 없|곧/)).toBeInTheDocument()
  })
})
