import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/presentation/components/layout/bottom-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/mission',
}))

describe('BottomNav', () => {
  it('renders 5 tabs including 미션', () => {
    render(<BottomNav />)
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('기록')).toBeInTheDocument()
    expect(screen.getByText('미션')).toBeInTheDocument()
    expect(screen.getByText('리더보드')).toBeInTheDocument()
    expect(screen.getByText('프로필')).toBeInTheDocument()
  })

  it('mission tab links to /mission', () => {
    render(<BottomNav />)
    const link = screen.getByText('미션').closest('a')
    expect(link).toHaveAttribute('href', '/mission')
  })
})
