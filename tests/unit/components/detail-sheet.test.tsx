import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetailSheet } from '@/presentation/components/feed/detail-sheet'
import type { RunLog } from '@/domain/entities/run-log'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/presentation/components/feed/like-comment-bar', () => ({
  LikeCommentBar: () => <div data-testid="like-comment-bar" />,
}))

vi.mock('@/presentation/components/feed/comments-sheet', () => ({
  CommentsSheet: () => <div data-testid="comments-sheet" />,
}))

const run: RunLog = {
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
}

describe('DetailSheet', () => {
  it('shows run details when open=true', () => {
    render(<DetailSheet run={run} open onClose={() => {}} />)
    expect(screen.getAllByText('이두승').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('가볍게 달릴 예정').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('분').length).toBeGreaterThanOrEqual(1)
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
    expect(sheet.style.transform).toContain('translateY(110%)')
  })

  it('renders LikeCommentBar when open', () => {
    render(<DetailSheet run={run} open onClose={() => {}} memberId="m1" />)
    expect(screen.getByTestId('like-comment-bar')).toBeDefined()
  })
})
