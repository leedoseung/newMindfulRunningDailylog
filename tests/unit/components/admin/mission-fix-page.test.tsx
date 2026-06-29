import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MissionFixPage } from '@/presentation/components/admin/mission-fix-page'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

describe('<MissionFixPage>', () => {
  it('searches members by name and shows results', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [{ id: 'm1', name: '한채원', generation: '5기' }] }),
    })
    render(<MissionFixPage />)
    fireEvent.change(screen.getByPlaceholderText('회원 이름'), { target: { value: '한채원' } })
    fireEvent.click(screen.getByText('검색'))
    await waitFor(() => expect(screen.getByText('한채원')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/members/search?q=%ED%95%9C%EC%B1%84%EC%9B%90')
  })

  it('selecting member loads participations', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [{ id: 'm1', name: '한채원', generation: '5기' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          participations: [{
            id: 'p1', challengeId: 'c1', challengeTitle: '런지 100일',
            startDate: '2026-06-15', durationDays: 100,
            passesRemaining: 2, failedAt: null, completedAt: null,
          }],
        }),
      })
    render(<MissionFixPage />)
    fireEvent.change(screen.getByPlaceholderText('회원 이름'), { target: { value: '한채원' } })
    fireEvent.click(screen.getByText('검색'))
    await waitFor(() => screen.getByText('한채원'))
    fireEvent.click(screen.getByText('한채원'))
    await waitFor(() => expect(screen.getByText('런지 100일')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/participations?memberId=m1')
  })
})
