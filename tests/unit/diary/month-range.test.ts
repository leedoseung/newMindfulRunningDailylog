import { describe, it, expect } from 'vitest'
import { parseYearMonth, monthDateRange, isValidMonth } from '@/domain/diary/month-range'

describe('parseYearMonth', () => {
  it('parses YYYY-MM', () => {
    expect(parseYearMonth('2026-06')).toEqual({ year: 2026, month: 6 })
  })
  it('rejects bad format', () => {
    expect(parseYearMonth('2026-6')).toBeNull()
    expect(parseYearMonth('2026-13')).toBeNull()
    expect(parseYearMonth('2026-00')).toBeNull()
    expect(parseYearMonth('abc')).toBeNull()
    expect(parseYearMonth('')).toBeNull()
  })
})

describe('monthDateRange', () => {
  it('returns first/last day inclusive YYYY-MM-DD', () => {
    expect(monthDateRange(2026, 6)).toEqual({ start: '2026-06-01', end: '2026-06-30' })
    expect(monthDateRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(monthDateRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(monthDateRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-01-31' })
    expect(monthDateRange(2026, 12)).toEqual({ start: '2026-12-01', end: '2026-12-31' })
  })
})

describe('isValidMonth', () => {
  const now = new Date('2026-06-18T00:00:00+09:00')
  it('accepts current and past months', () => {
    expect(isValidMonth(2026, 6, now)).toBe(true)
    expect(isValidMonth(2026, 5, now)).toBe(true)
    expect(isValidMonth(2025, 12, now)).toBe(true)
  })
  it('rejects future months', () => {
    expect(isValidMonth(2026, 7, now)).toBe(false)
    expect(isValidMonth(2027, 1, now)).toBe(false)
  })
  it('rejects before app existence (2025-05 floor)', () => {
    expect(isValidMonth(2025, 4, now)).toBe(false)
    expect(isValidMonth(2024, 12, now)).toBe(false)
  })
})
