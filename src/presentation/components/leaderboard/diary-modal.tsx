'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DetailSheet } from '../feed/detail-sheet'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  memberId: string | null
  memberName: string
  open: boolean
  onClose: () => void
  currentMemberId?: string
  currentMemberName?: string
  currentMemberAvatarUrl?: string
}

export function DiaryModal({ memberId, memberName, open, onClose, currentMemberId = '', currentMemberName = '', currentMemberAvatarUrl = '' }: Props) {
  const [records, setRecords] = useState<RunLog[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRun, setSelectedRun] = useState<RunLog | null>(null)

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
    <>
    <DetailSheet
      run={selectedRun}
      open={Boolean(selectedRun)}
      onClose={() => setSelectedRun(null)}
      memberId={currentMemberId}
      memberName={currentMemberName}
      memberAvatarUrl={currentMemberAvatarUrl}
    />
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="max-w-sm"
        style={{
          background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 20, maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ fontFamily: FONT, fontSize: '0.95rem', fontWeight: 500, color: '#111' }}>
            {memberName}의 달리기 일기장
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#BBB', padding: '16px 0', textAlign: 'center' }}>
            불러오는 중...
          </p>
        ) : records.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#BBB', padding: '16px 0', textAlign: 'center' }}>
            기록이 없습니다
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {records.map(run => (
              <button
                key={run.id}
                type="button"
                onClick={() => setSelectedRun(run)}
                style={{
                  background: '#F7F7F5', borderRadius: 14, padding: '14px 16px',
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EFEFED')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F7F7F5')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: FONT, fontSize: '1.4rem', fontWeight: 300, color: '#111', lineHeight: 1 }}>
                    {run.durationMin}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#AAA', marginLeft: 3 }}>분</span>
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: '#CCC' }}>{run.date}</span>
                </div>
                {run.title && (
                  <div style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 500, color: '#333', marginTop: 6 }}>
                    {run.title}
                  </div>
                )}
                {run.thoughtAfter && (
                  <p style={{
                    fontFamily: FONT, fontSize: '0.72rem', color: '#888', marginTop: 5,
                    lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: '5px 0 0',
                  }}>{run.thoughtAfter}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
