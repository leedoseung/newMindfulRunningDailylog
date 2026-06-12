import { render, screen } from '@testing-library/react'
import { CertificateCard } from '@/presentation/components/mission/certificate-card'

describe('CertificateCard', () => {
  it('renders member name + challenge title + day count', () => {
    render(
      <CertificateCard
        memberName="두승"
        challengeTitle="런지 100일 시즌1"
        completedAt="2026-10-09T00:00:00Z"
        durationDays={100}
      />
    )
    expect(screen.getByText('두승')).toBeInTheDocument()
    expect(screen.getByText('런지 100일 시즌1')).toBeInTheDocument()
    expect(screen.getByText('100일 완주')).toBeInTheDocument()
    expect(screen.getByText('2026-10-09')).toBeInTheDocument()
  })

  it('renders share button', () => {
    render(<CertificateCard memberName="t" challengeTitle="t" completedAt="2026-10-09T00:00:00Z" durationDays={100} />)
    expect(screen.getByText('공유하기')).toBeInTheDocument()
  })
})
