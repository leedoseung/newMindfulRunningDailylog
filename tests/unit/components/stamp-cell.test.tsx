import { render } from '@testing-library/react'
import { StampCell } from '@/presentation/components/mission/stamp-cell'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

const cell = (overrides: Partial<MissionDayCell> = {}): MissionDayCell => ({
  dayIndex: 0,
  date: '2026-07-01',
  state: 'done',
  count: 100,
  usedPass: false,
  ...overrides,
})

describe('StampCell', () => {
  it('renders done state with stamp class', () => {
    const { container } = render(<StampCell cell={cell({ state: 'done' })} />)
    expect(container.querySelector('[data-state="done"]')).toBeInTheDocument()
  })

  it('renders today state with dashed border', () => {
    const { container } = render(<StampCell cell={cell({ state: 'today', count: 30 })} />)
    expect(container.querySelector('[data-state="today"]')).toBeInTheDocument()
  })

  it('renders partial state', () => {
    const { container } = render(<StampCell cell={cell({ state: 'partial', count: 50 })} />)
    expect(container.querySelector('[data-state="partial"]')).toBeInTheDocument()
  })

  it('renders pass state', () => {
    const { container } = render(<StampCell cell={cell({ state: 'pass', usedPass: true })} />)
    expect(container.querySelector('[data-state="pass"]')).toBeInTheDocument()
  })

  it('renders miss state', () => {
    const { container } = render(<StampCell cell={cell({ state: 'miss', count: 0 })} />)
    expect(container.querySelector('[data-state="miss"]')).toBeInTheDocument()
  })

  it('renders future state', () => {
    const { container } = render(<StampCell cell={cell({ state: 'future', count: 0 })} />)
    expect(container.querySelector('[data-state="future"]')).toBeInTheDocument()
  })

  it('applies deterministic rotation based on date', () => {
    const { container: a } = render(<StampCell cell={cell({ date: '2026-07-01', state: 'done' })} />)
    const { container: b } = render(<StampCell cell={cell({ date: '2026-07-01', state: 'done' })} />)
    const styleA = a.querySelector('[data-state]')?.getAttribute('style') ?? ''
    const styleB = b.querySelector('[data-state]')?.getAttribute('style') ?? ''
    expect(styleA).toBe(styleB)
  })
})
