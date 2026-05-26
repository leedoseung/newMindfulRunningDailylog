import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetailSheet } from '@/presentation/components/feed/detail-sheet'
import type { RunLog } from '@/domain/entities/run-log'

const run: RunLog = {
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
}

describe('DetailSheet', () => {
  it('shows run details when open=true', () => {
    render(<DetailSheet run={run} open onClose={() => {}} />)
    expect(screen.getByText('45분')).toBeInTheDocument()
    expect(screen.getByText('이두승')).toBeInTheDocument()
    expect(screen.getByText('가볍게 달릴 예정')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<DetailSheet run={run} open onClose={onClose} />)
    const backdrop = screen.getByTestId('detail-sheet-backdrop')
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('is hidden when open=false', () => {
    const { container } = render(<DetailSheet run={run} open={false} onClose={() => {}} />)
    const sheet = container.querySelector('[data-testid="detail-sheet"]') as HTMLElement
    expect(sheet.style.transform).toContain('translateY(100%)')
  })
})
