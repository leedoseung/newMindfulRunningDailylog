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

function computeMonthlyTrend(runs: RunLog[], months = 6): Array<{ key: string; label: string; count: number; minutes: number }> {
  const now = new Date()
  const buckets: Array<{ key: string; label: string; count: number; minutes: number }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ key, label: `${d.getMonth() + 1}월`, count: 0, minutes: 0 })
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]))
  for (const r of runs) {
    const k = r.date.slice(0, 7)
    const i = idx.get(k)
    if (i === undefined) continue
    const b = buckets[i]
    if (!b) continue
    b.count += 1
    b.minutes += r.durationMin
  }
  return buckets
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
  const trend = useMemo(() => computeMonthlyTrend(runs), [runs])

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

      <div style={{ background: 'var(--mr-surface)', borderRadius: 16, margin: '0 16px 12px', overflow: 'hidden', border: '1px solid var(--mr-border)' }}>
        <TrendChart data={trend} />
        <div style={{ height: 1, background: 'var(--mr-border)' }} />
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
        <div style={{ display: 'flex', background: 'var(--mr-track)', borderRadius: 10, padding: 3 }}>
          {(['feed', 'calendar'] as SubView[]).map(v => (
            <button
              key={v}
              type="button"
              className="focus-ring"
              onClick={() => setSubView(v)}
              style={{
                flex: 1, padding: '7px 0', border: 'none', borderRadius: 8,
                background: subView === v ? 'var(--mr-surface)' : 'transparent',
                boxShadow: subView === v ? 'var(--mr-shadow-sm)' : 'none',
                color: 'var(--mr-text-1)', fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600,
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
          background: 'var(--mr-surface)', margin: '0 16px 40px',
          borderRadius: 16, border: '1px solid var(--mr-border)', overflow: 'hidden',
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
      borderLeft: divider ? '1px solid var(--mr-border)' : 'none',
      borderRight: divider ? '1px solid var(--mr-border)' : 'none',
      fontFamily: FONT,
    }}>
      <div style={{
        fontSize: '1.5rem', fontWeight: 700, color: 'var(--mr-text-1)',
        letterSpacing: '-0.02em', lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {num}
        {unit && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--mr-text-2)', marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--mr-text-2)', marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function TrendChart({ data }: { data: Array<{ key: string; label: string; count: number; minutes: number }> }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const last = data[data.length - 1]
  return (
    <div style={{ padding: '14px 18px 10px', fontFamily: FONT }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 10,
      }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--mr-text-2)', fontWeight: 600, letterSpacing: 0.4 }}>
          최근 6개월 추이
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--mr-text-2)' }}>
          이번달 <b style={{ color: 'var(--mr-text-1)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{last?.count ?? 0}</b>회
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`,
        gap: 8, alignItems: 'end', height: 56,
      }}>
        {data.map((d, i) => {
          const ratio = d.count / max
          const isCurrent = i === data.length - 1
          return (
            <div key={d.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div style={{
                flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end',
              }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(d.count > 0 ? 8 : 3, ratio * 100)}%`,
                  background: d.count === 0
                    ? 'var(--mr-border)'
                    : isCurrent ? 'var(--mr-text-1)' : 'var(--mr-heat-3)',
                  borderRadius: 4,
                  transition: 'height 0.2s',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`,
        gap: 8, marginTop: 6,
      }}>
        {data.map((d, i) => (
          <div key={d.key} style={{
            textAlign: 'center', fontSize: '0.62rem',
            color: i === data.length - 1 ? 'var(--mr-text-1)' : 'var(--mr-text-2)',
            fontWeight: i === data.length - 1 ? 700 : 500,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: FONT }}>
      <div style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.5 }}>🏃</div>
      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--mr-text-1)', marginBottom: 4 }}>
        아직 기록이 없어요
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--mr-text-2)' }}>
        첫 러닝 기록을 남겨보세요
      </div>
    </div>
  )
}
