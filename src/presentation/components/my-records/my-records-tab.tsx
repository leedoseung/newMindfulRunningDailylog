'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MyRecordCard } from './my-record-card'
import { CalendarView } from './calendar-view'
import { DetailSheet } from '../feed/detail-sheet'
import type { RunLog } from '@/domain/entities/run-log'
import { LoadingOverlay } from '../shared/loading-overlay'

type Props = {
  runs: RunLog[]
  memberId: string
}

type SubView = 'feed' | 'calendar'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

function computeStats(runs: RunLog[]) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyCount = runs.filter(r => r.date.startsWith(month)).length
  const totalMinutes = runs.reduce((sum, r) => sum + r.durationMin, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainMin = totalMinutes % 60
  const streak = computeStreak(runs)
  return { monthlyCount, totalHours, remainMin, streak }
}

function computeStreak(runs: RunLog[]): number {
  const dates = new Set(runs.map(r => r.date))
  let streak = 0
  const cursor = new Date()
  // include today only if there's a record today; otherwise start from yesterday
  for (let i = 0; i < 366; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    if (dates.has(key)) {
      streak += 1
    } else if (i === 0) {
      // ok to skip today if user hasn't run yet
    } else {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function MyRecordsTab({ runs, memberId }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [subView, setSubView] = useState<SubView>('feed')
  const [overlay, setOverlay] = useState<{ success: boolean; message: string } | null>(null)
  const [openRun, setOpenRun] = useState<RunLog | null>(null)
  const stats = useMemo(() => computeStats(runs), [runs])

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

      <div style={{ background: '#fff', borderRadius: 16, margin: '0 16px 12px', overflow: 'hidden', border: '1px solid #f0f0f3' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '18px 12px' }}>
          <Stat num={stats.monthlyCount} unit="회" label="이번달" />
          <Stat
            num={`${stats.totalHours}h${stats.remainMin > 0 ? ' ' + stats.remainMin + 'm' : ''}`}
            label="누적"
            divider
          />
          <Stat num={stats.streak} unit="일" label="🔥 스트릭" />
        </div>
      </div>

      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: 10, padding: 3 }}>
          {(['feed', 'calendar'] as SubView[]).map(v => (
            <button
              key={v}
              type="button"
              className="focus-ring"
              onClick={() => setSubView(v)}
              style={{
                flex: 1, padding: '7px 0', border: 'none', borderRadius: 8,
                background: subView === v ? '#fff' : 'transparent',
                boxShadow: subView === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                color: '#111', fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {v === 'feed' ? '피드' : '달력'}
            </button>
          ))}
        </div>
      </div>

      {subView === 'feed' ? (
        <div style={{
          background: '#fff', margin: '0 16px 40px',
          borderRadius: 16, border: '1px solid #f0f0f3', overflow: 'hidden',
        }}>
          {runs.length === 0 ? (
            <EmptyState />
          ) : (
            runs.map((run, i) => (
              <div key={run.id} style={i === runs.length - 1 ? { borderBottom: 'none' } as React.CSSProperties : undefined}>
                <MyRecordCard
                  run={run}
                  deleting={deleting === run.id}
                  onEdit={() => router.push(`/record?edit=${run.id}`)}
                  onDelete={() => handleDelete(run.id)}
                  onOpen={() => setOpenRun(run)}
                />
              </div>
            ))
          )}
        </div>
      ) : (
        <CalendarView runs={runs} memberId={memberId} onOpenRun={setOpenRun} />
      )}

      <DetailSheet
        run={openRun}
        open={openRun !== null}
        onClose={() => setOpenRun(null)}
        memberId={memberId}
        onDeleted={() => { setOpenRun(null); router.refresh() }}
      />
    </>
  )
}

function Stat({ num, unit, label, divider }: { num: number | string; unit?: string; label: string; divider?: boolean }) {
  return (
    <div style={{
      textAlign: 'center', padding: '2px 4px',
      borderLeft: divider ? '1px solid #f0f0f3' : 'none',
      borderRight: divider ? '1px solid #f0f0f3' : 'none',
      fontFamily: FONT,
    }}>
      <div style={{
        fontSize: '1.5rem', fontWeight: 700, color: '#111',
        letterSpacing: '-0.02em', lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {num}
        {unit && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#888', marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: FONT }}>
      <div style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.5 }}>🏃</div>
      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111', marginBottom: 4 }}>
        아직 기록이 없어요
      </div>
      <div style={{ fontSize: '0.78rem', color: '#888' }}>
        첫 러닝 기록을 남겨보세요
      </div>
    </div>
  )
}
