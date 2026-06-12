import { render, screen } from '@testing-library/react'
import { ChallengeHeader } from '@/presentation/components/mission/challenge-header'

describe('ChallengeHeader', () => {
  it('renders Day N / 100 label', () => {
    render(
      <ChallengeHeader
        title="런지 100일 챌린지"
        todayIndex={46}
        durationDays={100}
        streak={12}
        passesRemaining={4}
        passCount={5}
      />
    )
    expect(screen.getByText('Day 47')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
    expect(screen.getByText('streak')).toBeInTheDocument()
    expect(screen.getByText('12일')).toBeInTheDocument()
    expect(screen.getByText('면죄권')).toBeInTheDocument()
    expect(screen.getByText('4 / 5')).toBeInTheDocument()
  })

  it('renders before-start state when todayIndex == -1', () => {
    render(
      <ChallengeHeader
        title="런지 100일 챌린지"
        todayIndex={-1}
        durationDays={100}
        streak={0}
        passesRemaining={5}
        passCount={5}
      />
    )
    expect(screen.getByText(/시작 전|준비/)).toBeInTheDocument()
  })
})
