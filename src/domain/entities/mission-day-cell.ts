import type { MissionLog } from './mission-log'

export type MissionDayCellState =
  | 'today'
  | 'done'
  | 'partial'
  | 'pass'
  | 'empty'   // reserved for non-active states (e.g., pre-start)
  | 'miss'
  | 'future'

export type MissionDayCell = {
  dayIndex: number             // 0~99
  date: string                 // 'YYYY-MM-DD'
  state: MissionDayCellState
  count: number                // display, capped at 100
  usedPass: boolean
}

type ComputeArgs = {
  dayIndex: number
  cellDate: string
  today: string
  log: MissionLog | null
}

export function computeMissionDayCell({
  dayIndex,
  cellDate,
  today,
  log,
}: ComputeArgs): MissionDayCell {
  const displayCount = log ? Math.min(log.count, 100) : 0
  const usedPass = log?.usedPass ?? false

  let state: MissionDayCellState

  if (cellDate > today) {
    state = 'future'
  } else if (cellDate === today) {
    state = log && log.count >= 100 ? 'done' : 'today'
  } else if (usedPass) {
    state = 'pass'
  } else if (log && log.count >= 100) {
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
    usedPass,
  }
}
