import type { MissionLog } from './mission-log'

export type MissionDayCellState =
  | 'today'
  | 'done'
  | 'partial'
  | 'pass'
  | 'rest'
  | 'empty'   // reserved for non-active states (e.g., pre-start)
  | 'miss'
  | 'future'

export type MissionDayCell = {
  dayIndex: number             // 0~99
  date: string                 // 'YYYY-MM-DD'
  state: MissionDayCellState
  count: number                // display, capped at bonusGoal
  excess?: number              // count above bonusGoal (>= 0)
  usedPass: boolean
  isRestDay?: boolean
  note?: string | null
}

type ComputeArgs = {
  dayIndex: number
  cellDate: string
  today: string
  log: MissionLog | null
  goalMin?: number       // stamp threshold (default 10)
  bonusGoal?: number     // gold-bonus threshold (default 100)
}

export function computeMissionDayCell({
  dayIndex,
  cellDate,
  today,
  log,
  goalMin = 10,
  bonusGoal = 100,
}: ComputeArgs): MissionDayCell {
  const rawCount = log?.count ?? 0
  const displayCount = Math.min(rawCount, bonusGoal)
  const excess = Math.max(rawCount - bonusGoal, 0)
  const usedPass = log?.usedPass ?? false
  const isRestDay = log?.isRestDay ?? false
  const note = log?.note ?? null

  let state: MissionDayCellState

  if (cellDate > today) {
    state = 'future'
  } else if (isRestDay) {
    state = 'rest'
  } else if (cellDate === today) {
    state = log && log.count >= goalMin ? 'done' : 'today'
  } else if (usedPass) {
    state = 'pass'
  } else if (log && log.count >= goalMin) {
    state = 'done'
  } else if (log && log.count > 0) {
    state = 'partial'
  } else {
    state = 'miss'
  }

  return {
    dayIndex,
    date: cellDate,
    state,
    count: displayCount,
    excess,
    usedPass,
    isRestDay,
    note,
  }
}
