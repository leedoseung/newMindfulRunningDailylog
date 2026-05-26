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

export function DiaryModal({ memberId, memberName, open, onClose }: Props) {
  const [records, setRecords] = useState<RunLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !memberId) return
    setLoading(true)
    fetch(`/api/member-records?memberId=${encodeURIComponent(memberId)}`)
      .then(r => r.json())
      .then((data: RunLog[]) => setRecords(data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [open, memberId])

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-sm max-h-[80vh] overflow-y-auto"
        style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-base">
            {memberName}의 달리기 일기장
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-white/40 text-sm py-4 text-center">불러오는 중...</p>
        ) : records.length === 0 ? (
          <p className="text-white/40 text-sm py-4 text-center">기록이 없습니다</p>
        ) : (
          <div className="space-y-3 mt-2">
            {records.map(run => (
              <div
                key={run.id}
                className="rounded-xl p-3 border border-white/5"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold font-display text-white">{run.durationMin}분</span>
                  <span className="text-xs text-white/30">{run.date}</span>
                </div>
                {run.title && <div className="text-sm text-white/70 mt-1">{run.title}</div>}
                {run.thoughtAfter && (
                  <p className="text-xs text-white/50 mt-1.5 line-clamp-2">{run.thoughtAfter}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
