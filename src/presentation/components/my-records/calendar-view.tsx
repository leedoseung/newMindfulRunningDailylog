'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MyRecordCard } from './my-record-card'
import { ShareButton } from '@/presentation/components/diary/share-button'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  runs: RunLog[]
  memberId: string
  onOpenRun?: (run: RunLog) => void
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

// Strava-ish heatmap palette (green ramp)
const BUCKETS = ['#f2f2f7', '#d6efdc', '#9ad9a8', '#4cb867', '#1f9d49']

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayStr() {
  const d = new Date()
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

function bucketFor(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

export function CalendarView({ runs, memberId, onOpenRun }: Props) {
  const router = useRouter()
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const today = todayStr()

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelected(null)
  }

  const countByDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of runs) m.set(r.date, (m.get(r.date) ?? 0) + 1)
    return m
  }, [runs])

  const selectedRuns = selected ? runs.filter(r => r.date === selected) : []

  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7

  // monthly summary
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthRuns = runs.filter(r => r.date.startsWith(monthPrefix))
  const monthCount = monthRuns.length
  const monthMinutes = monthRuns.reduce((s, r) => s + r.durationMin, 0)
  const monthHours = Math.floor(monthMinutes / 60)
  const monthRemain = monthMinutes % 60

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
    <div style={{ paddingBottom: 40, fontFamily: FONT }}>
      <div style={{
        margin: '0 16px 10px', background: '#fff', borderRadius: 16,
        border: '1px solid #f0f0f3', padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={prevMonth}
            aria-label="이전 달" className="focus-ring"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.4rem', color: '#888', lineHeight: 1, padding: '2px 8px',
            }}>‹</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>
              {viewYear}.{String(viewMonth + 1).padStart(2, '0')}
            </div>
            <ShareButton
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/diary/${memberId}/${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`}
              title={`${viewYear}.${viewMonth + 1} 달리기 일기`}
              text={`${viewYear}.${viewMonth + 1} 한 달 기록을 봐줘`}
              variant="icon-dark"
            >
              <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>↗</span>
            </ShareButton>
          </div>

          <button type="button" onClick={nextMonth}
            aria-label="다음 달" className="focus-ring"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.4rem', color: '#888', lineHeight: 1, padding: '2px 8px',
            }}>›</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, fontSize: '0.72rem', color: '#888' }}>
          <span><b style={{ color: '#111', fontWeight: 700 }}>{monthCount}</b>회</span>
          <span style={{ color: '#e5e5ea' }}>·</span>
          <span><b style={{ color: '#111', fontWeight: 700 }}>{monthHours}h{monthRemain > 0 ? ` ${monthRemain}m` : ''}</b></span>
        </div>
      </div>

      <div style={{
        margin: '0 16px 14px', background: '#fff', borderRadius: 16,
        border: '1px solid #f0f0f3', padding: '14px 14px 12px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: '0.65rem', fontWeight: 600,
              color: i === 0 ? '#fc5252' : '#888',
              paddingBottom: 4,
            }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {Array.from({ length: totalCells }, (_, idx) => {
            const day = idx - firstDow + 1
            if (day < 1 || day > daysInMonth) {
              return <div key={idx} style={{ aspectRatio: '1' }} />
            }
            const dateStr = toDateStr(viewYear, viewMonth, day)
            const count = countByDate.get(dateStr) ?? 0
            const bucket = bucketFor(count)
            const isSel = selected === dateStr
            const isTdy = dateStr === today
            const bg = BUCKETS[bucket]
            const textOnFill = bucket >= 2

            return (
              <button
                key={idx}
                type="button"
                disabled={count === 0}
                className={count > 0 ? 'focus-ring' : undefined}
                onClick={() => setSelected(isSel ? null : dateStr)}
                style={{
                  aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bg, borderRadius: 8,
                  border: isSel ? '2px solid #111' : isTdy ? '2px solid #ff5a36' : '1px solid transparent',
                  color: textOnFill ? '#fff' : '#111',
                  fontSize: '0.78rem', fontWeight: count > 0 ? 700 : 400,
                  fontFamily: FONT, fontVariantNumeric: 'tabular-nums',
                  cursor: count > 0 ? 'pointer' : 'default',
                  padding: 0, transition: 'transform 0.12s',
                }}
              >
                {day}
              </button>
            )
          })}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: 4, marginTop: 12, fontSize: '0.62rem', color: '#888',
        }}>
          <span>적게</span>
          {BUCKETS.map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: c, border: '1px solid #ebebef' }} />
          ))}
          <span>많이</span>
        </div>
      </div>

      {selected ? (
        <div style={{
          background: '#fff', margin: '0 16px',
          borderRadius: 16, border: '1px solid #f0f0f3', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 20px',
            fontSize: '0.72rem', fontWeight: 600, color: '#666',
            letterSpacing: '0.5px',
            borderBottom: '1px solid #f1f1f4',
            background: '#fafafa',
          }}>
            {selected}
          </div>
          {selectedRuns.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '24px 0', fontSize: '0.85rem' }}>
              이 날은 기록이 없습니다
            </p>
          ) : (
            selectedRuns.map(run => (
              <MyRecordCard
                key={run.id}
                run={run}
                deleting={deleting === run.id}
                onEdit={() => router.push(`/record?edit=${run.id}`)}
                onDelete={() => handleDelete(run.id)}
                onOpen={onOpenRun ? () => onOpenRun(run) : undefined}
              />
            ))
          )}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#aaa', padding: '8px 16px 0', fontSize: '0.72rem' }}>
          색칠된 날짜를 탭하면 기록을 볼 수 있어요
        </p>
      )}
    </div>
  )
}
