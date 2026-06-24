'use client'

import { useState } from 'react'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { StampCell } from './stamp-cell'
import { DayDetailSheet } from './day-detail-sheet'

type Props = { cells: MissionDayCell[]; goal: number; revivedAt?: string | null }

export function MissionBoard({ cells, goal, revivedAt = null }: Props) {
  if (cells.length !== 100) {
    throw new Error(`MissionBoard expects 100 cells, got ${cells.length}`)
  }

  const [selected, setSelected] = useState<MissionDayCell | null>(null)
  const revivalAnchor = revivedAt ? revivedAt.slice(0, 10) : null

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 6,
        }}
      >
        {cells.map((cell) => {
          const isPreRevival = revivalAnchor != null && cell.date < revivalAnchor
          return (
            <div
              key={cell.dayIndex}
              style={{ position: 'relative', opacity: isPreRevival ? 0.4 : 1 }}
            >
              <StampCell cell={cell} onClick={setSelected} />
              {isPreRevival && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  fontSize: 7, fontWeight: 700,
                  background: '#EDE9FE', color: '#7C3AED',
                  padding: '1px 3px', borderRadius: 4,
                  lineHeight: 1.2, pointerEvents: 'none',
                }}>
                  pre
                </span>
              )}
            </div>
          )
        })}
      </div>
      <DayDetailSheet cell={selected} goal={goal} revivedAt={revivedAt} onClose={() => setSelected(null)} />
    </>
  )
}
