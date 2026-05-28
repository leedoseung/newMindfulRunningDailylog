'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

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
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20 }}
      >
        <DialogHeader>
          <DialogTitle style={{ fontFamily: FONT, fontSize: '0.95rem', fontWeight: 500, color: '#111' }}>
            {memberName}의 오늘의 러닝
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#BBB', padding: '16px 0', textAlign: 'center' }}>
            불러오는 중...
          </p>
        ) : runs.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#BBB', padding: '16px 0', textAlign: 'center' }}>
            오늘 기록이 없습니다
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {runs.map(run => (
              <div
                key={run.id}
                style={{ background: '#F7F7F5', borderRadius: 14, padding: '14px 16px' }}
              >
                <div style={{ fontFamily: FONT, fontSize: '1.6rem', fontWeight: 300, color: '#111', lineHeight: 1 }}>
                  {run.durationMin}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#AAA', marginLeft: 3 }}>분</span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: '0.65rem', color: '#AAA', marginTop: 4 }}>
                  {run.date} · {run.location || '위치 없음'}
                </div>
                {run.title && (
                  <div style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 400, color: '#444', marginTop: 6 }}>
                    {run.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
