'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MyRecordCard } from './my-record-card'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  runs: RunLog[]
  memberId: string
}

function computeStats(runs: RunLog[]) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyCount = runs.filter(r => r.date.startsWith(month)).length
  const totalMinutes = runs.reduce((sum, r) => sum + r.durationMin, 0)
  const totalHours   = Math.floor(totalMinutes / 60)
  const remainMin    = totalMinutes % 60
  return { monthlyCount, totalHours, remainMin }
}

export function MyRecordsTab({ runs, memberId }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const stats = computeStats(runs)

  async function handleDelete(id: string) {
    if (!confirm('이 기록을 삭제할까요?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/record/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* 통계 요약 카드 */}
      <div style={{
        margin: '0 22px 16px', background: '#2d3031', borderRadius: '20px',
        padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.58rem', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            이번달
          </div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {stats.monthlyCount}
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888', marginLeft: '4px' }}>회</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.58rem', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            누적 시간
          </div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {stats.totalHours}
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888', marginLeft: '2px' }}>h</span>
            {stats.remainMin > 0 && (
              <span style={{ fontSize: '1.1rem', fontWeight: 400, color: '#888', marginLeft: '4px' }}>{stats.remainMin}m</span>
            )}
          </div>
        </div>
      </div>

      {/* 기록 목록 */}
      {runs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '0.875rem' }}>
          아직 기록이 없습니다
        </p>
      ) : (
        runs.map(run => (
          <MyRecordCard
            key={run.id}
            run={run}
            deleting={deleting === run.id}
            onEdit={() => router.push(`/record?edit=${run.id}`)}
            onDelete={() => handleDelete(run.id)}
          />
        ))
      )}
    </div>
  )
}
