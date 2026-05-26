'use client'

import { useState } from 'react'
import { RunCard } from './run-card'
import { DetailSheet } from './detail-sheet'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  runs: RunLog[]
}

export function RunFeed({ runs }: Props) {
  const [selected, setSelected] = useState<RunLog | null>(null)

  return (
    <>
      <div
        data-testid="run-feed"
        className="columns-2 gap-3 px-3 pt-3"
      >
        {runs.map(run => (
          <div key={run.id} className="mb-3 break-inside-avoid">
            <RunCard run={run} onClick={setSelected} />
          </div>
        ))}
        {runs.length === 0 && (
          <p className="col-span-2 text-center text-white/40 py-10 text-sm">
            최근 달리기 기록이 없습니다
          </p>
        )}
      </div>
      {selected && (
        <DetailSheet
          run={selected}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
