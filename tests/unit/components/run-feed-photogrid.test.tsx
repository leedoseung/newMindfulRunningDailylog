import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PhotoGrid } from '@/presentation/components/feed/run-feed'
import type { RunLog } from '@/domain/entities/run-log'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// jsdom lacks IntersectionObserver — stub it out so infinite scroll hook doesn't throw.
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
  root = null
  rootMargin = ''
  thresholds = []
}
;(globalThis as unknown as { IntersectionObserver: typeof IOStub }).IntersectionObserver = IOStub

function makeRun(overrides: Partial<RunLog> = {}): RunLog {
  return {
    id: 'r1', memberId: 'm1', memberName: '이두승', memberAvatarUrl: '', memberInstaId: '',
    date: '2026-05-26', runTime: null, durationMin: 45, title: 'default',
    thoughtBefore: '', thoughtDuring: '', thoughtAfter: '',
    location: '남산', photoUrl: '/photo.jpg', rawPhotoUrl: null, createdAt: '2026-05-26T00:00:00Z',
    likeCount: 0, commentCount: 0,
    ...overrides,
  }
}

describe('PhotoGrid — refresh sync', () => {
  it('reflects updated initialRuns when parent re-renders after router.refresh()', () => {
    const first = [makeRun({ id: 'r1', title: '첫 러닝' })]
    const { rerender, container } = render(<PhotoGrid runs={first} initialOffset={1} />)
    expect(container.textContent).toContain('첫 러닝')

    // Simulate router.refresh(): server re-renders with a newly saved run at the top.
    const refreshed = [
      makeRun({ id: 'r2', title: '방금 저장한 러닝' }),
      makeRun({ id: 'r1', title: '첫 러닝' }),
    ]
    rerender(<PhotoGrid runs={refreshed} initialOffset={2} />)

    expect(container.textContent).toContain('방금 저장한 러닝')
    expect(container.textContent).toContain('첫 러닝')
  })
})
