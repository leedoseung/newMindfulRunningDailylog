'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  memberId: string | null
  memberName: string
  open: boolean
  onClose: () => void
}

export function TodayRunModal({ memberId, memberName, open, onClose }: Props) {
  const [runs, setRuns] = useState<RunLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/today-runs')
      .then(r => r.json())
      .then((data: RunLog[]) => {
        const memberRuns = data.filter(r => r.memberId === memberId)
        setRuns(memberRuns.length > 0 ? memberRuns : data.slice(0, 3))
      })
      .catch(() => setRuns([]))
      .finally(() => setLoading(false))
  }, [open, memberId])

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-sm"
        style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-base">
            {memberName}의 오늘의 러닝
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-white/40 text-sm py-4 text-center">불러오는 중...</p>
        ) : runs.length === 0 ? (
          <p className="text-white/40 text-sm py-4 text-center">오늘 기록이 없습니다</p>
        ) : (
          <div className="space-y-3 mt-2">
            {runs.map(run => (
              <div
                key={run.id}
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div className="text-xl font-bold font-display text-white">{run.durationMin}분</div>
                <div className="text-xs text-white/40 mt-0.5">{run.date} · {run.location || '위치 없음'}</div>
                {run.title && <div className="text-sm text-white/70 mt-1">{run.title}</div>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
