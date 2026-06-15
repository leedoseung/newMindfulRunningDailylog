'use client'

import { useState } from 'react'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { StampCell } from './stamp-cell'
import { DayDetailSheet } from './day-detail-sheet'

type Props = { cells: MissionDayCell[]; goal: number }

export function MissionBoard({ cells, goal }: Props) {
  if (cells.length !== 100) {
    throw new Error(`MissionBoard expects 100 cells, got ${cells.length}`)
  }

  const [selected, setSelected] = useState<MissionDayCell | null>(null)

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 6,
        }}
      >
        {cells.map((cell) => (
          <StampCell key={cell.dayIndex} cell={cell} onClick={setSelected} />
        ))}
      </div>
      <DayDetailSheet cell={selected} goal={goal} onClose={() => setSelected(null)} />
    </>
  )
}
