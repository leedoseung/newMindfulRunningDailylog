'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MyRecordCard } from './my-record-card'
import { CalendarView } from './calendar-view'
import type { RunLog } from '@/domain/entities/run-log'
import { LoadingOverlay } from '../shared/loading-overlay'

type Props = {
  runs: RunLog[]
  memberId: string
}

type SubView = 'feed' | 'calendar'

function computeStats(runs: RunLog[]) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyCount = runs.filter(r => r.date.startsWith(month)).length
  const totalMinutes = runs.reduce((sum, r) => sum + r.durationMin, 0)
  const totalHours   = Math.floor(totalMinutes / 60)
  const remainMin    = totalMinutes % 60
  return { monthlyCount, totalHours, remainMin }
}

export function MyRecordsTab({ runs, memberId: _memberId }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [subView, setSubView]   = useState<SubView>('feed')
  const [overlay, setOverlay]   = useState<{ success: boolean; message: string } | null>(null)
  const stats = computeStats(runs)

  async function handleDelete(id: string) {
    if (!confirm('이 기록을 삭제할까요?')) return
    setDeleting(id)
    setOverlay({ success: false, message: '삭제 중...' })
    try {
      const res = await fetch(`/api/record/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      setOverlay({ success: true, message: '삭제됐어요' })
      await new Promise<void>(r => setTimeout(r, 1100))
      setOverlay(null)
      router.refresh()
    } catch (err: unknown) {
      setOverlay(null)
      alert(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
    <LoadingOverlay
      show={overlay !== null}
      success={overlay?.success ?? false}
      message={overlay?.message}
    />
    <div style={{ paddingBottom: 40 }}>
      {/* Stats summary card */}
      <div style={{
        margin: '0 22px 16px', background: '#111111', borderRadius: 20,
        padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.58rem', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
            이번달
          </div>
          <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '2.2rem', fontWeight: 300, color: '#fff', lineHeight: 1 }}>
            {stats.monthlyCount}
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888', marginLeft: 4 }}>회</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.58rem', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
            누적 시간
          </div>
          <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '2.2rem', fontWeight: 300, color: '#fff', lineHeight: 1 }}>
            {stats.totalHours}
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888', marginLeft: 2 }}>h</span>
            {stats.remainMin > 0 && (
              <span style={{ fontSize: '1.1rem', fontWeight: 400, color: '#888', marginLeft: 4 }}>{stats.remainMin}m</span>
            )}
          </div>
        </div>
      </div>

      {/* Feed / Calendar sub-tab */}
      <div style={{
        display: 'flex', margin: '0 22px 16px',
        background: '#fff', borderRadius: 10, padding: '3px',
      }}>
        {(['feed', 'calendar'] as SubView[]).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setSubView(v)}
            style={{
              flex: 1, padding: '7px', textAlign: 'center',
              fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.65rem', fontWeight: 500,
              color: subView === v ? '#fff' : '#888',
              background: subView === v ? '#111111' : 'transparent',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {v === 'feed' ? '피드' : '달력'}
          </button>
        ))}
      </div>

      {subView === 'feed' ? (
        /* Feed view: record list */
        runs.length === 0 ? (
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
        )
      ) : (
        /* Calendar view */
        <CalendarView runs={runs} />
      )}
    </div>
    </>
  )
}
