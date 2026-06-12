import { render } from '@testing-library/react'
import { MissionBoard } from '@/presentation/components/mission/mission-board'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

function makeCells(): MissionDayCell[] {
  return Array.from({ length: 100 }, (_, i) => ({
    dayIndex: i,
    date: `2026-07-${String(i + 1).padStart(2, '0')}`,
    state: i < 10 ? 'done' : i === 10 ? 'today' : 'future',
    count: i < 10 ? 100 : i === 10 ? 30 : 0,
    usedPass: false,
  }))
}

describe('MissionBoard', () => {
  it('renders 100 cells in a 10-column grid', () => {
    const { container } = render(<MissionBoard cells={makeCells()} />)
    const cells = container.querySelectorAll('[data-state]')
    expect(cells).toHaveLength(100)
  })

  it('throws when cells.length !== 100', () => {
    expect(() => render(<MissionBoard cells={[]} />)).toThrow(/100/)
  })
})
