import { render } from '@testing-library/react'
import { MissionBoard } from '@/presentation/components/mission/mission-board'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

function makeCells(n: number): MissionDayCell[] {
  return Array.from({ length: n }, (_, i) => {
    const dayNum = i + 1
    const month = Math.floor((dayNum - 1) / 28) + 7
    const day = ((dayNum - 1) % 28) + 1
    return {
      dayIndex: i,
      date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      state: i < Math.min(2, n - 1) ? 'done' : i === Math.min(2, n - 1) ? 'today' : 'future',
      count: i < Math.min(2, n - 1) ? 100 : i === Math.min(2, n - 1) ? 30 : 0,
      usedPass: false,
    }
  })
}

describe('MissionBoard', () => {
  it('renders 100 cells for a 100-day challenge', () => {
    const { container } = render(<MissionBoard cells={makeCells(100)} goal={100} />)
    const cells = container.querySelectorAll('[data-state]')
    expect(cells).toHaveLength(100)
  })

  it('renders 30 cells for a 30-day challenge (S2)', () => {
    const { container } = render(<MissionBoard cells={makeCells(30)} goal={100} />)
    const cells = container.querySelectorAll('[data-state]')
    expect(cells).toHaveLength(30)
  })

  it('throws when cells is empty', () => {
    expect(() => render(<MissionBoard cells={[]} goal={100} />)).toThrow(/at least 1 cell/)
  })

  it('uses 10 columns for 100-day board', () => {
    const { container } = render(<MissionBoard cells={makeCells(100)} goal={100} />)
    const grid = container.querySelector('[data-mission-grid]') as HTMLElement
    expect(grid).toBeTruthy()
    expect(grid.style.gridTemplateColumns).toBe('repeat(10, 1fr)')
  })

  it('uses 6 columns for 30-day board', () => {
    const { container } = render(<MissionBoard cells={makeCells(30)} goal={100} />)
    const grid = container.querySelector('[data-mission-grid]') as HTMLElement
    expect(grid).toBeTruthy()
    expect(grid.style.gridTemplateColumns).toBe('repeat(6, 1fr)')
  })
})
