import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { StampCell } from './stamp-cell'

type Props = { cells: MissionDayCell[] }

export function MissionBoard({ cells }: Props) {
  if (cells.length !== 100) {
    throw new Error(`MissionBoard expects 100 cells, got ${cells.length}`)
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 6,
      }}
    >
      {cells.map(cell => (
        <StampCell key={cell.dayIndex} cell={cell} />
      ))}
    </div>
  )
}
