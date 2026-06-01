import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LikeCommentBar } from '@/presentation/components/feed/like-comment-bar'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const fetchMock = vi.fn()
global.fetch = fetchMock

describe('LikeCommentBar', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ liked: false, likeCount: 5 }) })
  })

  it('shows likeCount from props immediately', () => {
    render(<LikeCommentBar runId="r1" likeCount={5} commentCount={3} memberId="m1" onCommentOpen={() => {}} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows zero counts', () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ liked: false, likeCount: 0 }) })
    render(<LikeCommentBar runId="r1" likeCount={0} commentCount={0} memberId="m1" onCommentOpen={() => {}} />)
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2)
  })

  it('calls onCommentOpen when chat button is clicked', async () => {
    const onCommentOpen = vi.fn()
    render(<LikeCommentBar runId="r1" likeCount={0} commentCount={2} memberId="m1" onCommentOpen={onCommentOpen} />)
    await userEvent.click(screen.getByRole('button', { name: /댓글/ }))
    expect(onCommentOpen).toHaveBeenCalledOnce()
  })

  it('fetches like status on mount when memberId provided', async () => {
    render(<LikeCommentBar runId="r1" likeCount={0} commentCount={0} memberId="m1" onCommentOpen={() => {}} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/record/r1/like'))
  })

  it('does not fetch like status without memberId', async () => {
    render(<LikeCommentBar runId="r1" likeCount={0} commentCount={0} onCommentOpen={() => {}} />)
    await new Promise(r => setTimeout(r, 50))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
