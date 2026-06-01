import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentsSheet } from '@/presentation/components/feed/comments-sheet'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const fetchMock = vi.fn()
global.fetch = fetchMock

const mockComments = [
  { id: 'c1', memberId: 'm2', memberName: '김민지', memberAvatarUrl: '', body: '멋져요! 👏', createdAt: '2026-05-28T10:00:00Z' },
  { id: 'c2', memberId: 'm1', memberName: '이두승', memberAvatarUrl: '', body: '감사합니다!', createdAt: '2026-05-28T10:05:00Z' },
]

describe('CommentsSheet', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ comments: mockComments }) })
  })

  it('fetches and shows comments when open', async () => {
    render(<CommentsSheet runId="r1" open onClose={() => {}} memberId="m1" />)
    await waitFor(() => expect(screen.getByText('멋져요! 👏')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/record/r1/comments')
  })

  it('shows empty state when no comments', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ comments: [] }) })
    render(<CommentsSheet runId="r1" open onClose={() => {}} memberId="m1" />)
    await waitFor(() => expect(screen.getByText(/첫 번째 댓글/)).toBeInTheDocument())
  })

  it('shows login message when no memberId', async () => {
    render(<CommentsSheet runId="r1" open onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText(/로그인이 필요합니다/)).toBeInTheDocument())
  })

  it('shows delete button only on own comments', async () => {
    render(<CommentsSheet runId="r1" open onClose={() => {}} memberId="m1" />)
    await waitFor(() => screen.getByText('멋져요! 👏'))
    // m1 owns c2 ("감사합니다!"), not c1 ("멋져요!")
    const deleteButtons = screen.getAllByRole('button', { name: /댓글 삭제/ })
    expect(deleteButtons).toHaveLength(1)
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<CommentsSheet runId="r1" open onClose={onClose} memberId="m1" />)
    await waitFor(() => screen.getByText('멋져요! 👏'))
    await userEvent.click(screen.getByRole('button', { name: /닫기/ }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not fetch when closed', async () => {
    render(<CommentsSheet runId="r1" open={false} onClose={() => {}} memberId="m1" />)
    await new Promise(r => setTimeout(r, 50))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
