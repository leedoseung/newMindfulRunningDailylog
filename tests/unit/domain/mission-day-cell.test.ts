import { describe, it, expect } from 'vitest'
import { computeMissionDayCell } from '@/domain/entities/mission-day-cell'
import type { MissionLog } from '@/domain/entities/mission-log'

const log = (overrides: Partial<MissionLog> = {}): MissionLog => ({
  id: 'log1',
  participationId: 'p1',
  logDate: '2026-06-11',
  count: 0,
  completed: false,
  usedPass: false,
  updatedAt: '2026-06-11T10:00:00Z',
  ...overrides,
})

describe('computeMissionDayCell', () => {
  it('returns future when cellDate > today', () => {
    const cell = computeMissionDayCell({
      dayIndex: 50,
      cellDate: '2026-12-31',
      today: '2026-06-11',
      log: null,
    })
    expect(cell.state).toBe('future')
  })

  it('returns today when cellDate == today and no log', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-11',
      today: '2026-06-11',
      log: null,
    })
    expect(cell.state).toBe('today')
    expect(cell.count).toBe(0)
  })

  it('returns done when log.count >= 100', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-10',
      today: '2026-06-11',
      log: log({ count: 100, completed: true }),
    })
    expect(cell.state).toBe('done')
  })

  it('caps display count at 100 when log.count > 100', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-10',
      today: '2026-06-11',
      log: log({ count: 150, completed: true }),
    })
    expect(cell.state).toBe('done')
    expect(cell.count).toBe(100)
  })

  it('returns partial when 0 < count < 100', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-10',
      today: '2026-06-11',
      log: log({ count: 50 }),
    })
    expect(cell.state).toBe('partial')
    expect(cell.count).toBe(50)
  })

  it('returns pass when used_pass = true', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-10',
      today: '2026-06-11',
      log: log({ count: 0, usedPass: true }),
    })
    expect(cell.state).toBe('pass')
  })

  it('returns miss for past date without log', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-09',
      today: '2026-06-11',
      log: null,
    })
    expect(cell.state).toBe('miss')
  })

  it('returns miss for past date with count = 0 and no pass', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-09',
      today: '2026-06-11',
      log: log({ count: 0, usedPass: false }),
    })
    expect(cell.state).toBe('miss')
  })
})
