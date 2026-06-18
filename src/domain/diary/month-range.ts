const APP_FLOOR_YEAR = 2025
const APP_FLOOR_MONTH = 5 // app launched 2025-05; earlier months have no data

export function parseYearMonth(s: string): { year: number; month: number } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return null
  const [y, m] = s.split('-').map(Number)
  return { year: y!, month: m! }
}

export function monthDateRange(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` }
}

export function isValidMonth(year: number, month: number, now: Date = new Date()): boolean {
  const cur = { year: now.getFullYear(), month: now.getMonth() + 1 }
  if (year > cur.year || (year === cur.year && month > cur.month)) return false
  if (year < APP_FLOOR_YEAR || (year === APP_FLOOR_YEAR && month < APP_FLOOR_MONTH)) return false
  return true
}
