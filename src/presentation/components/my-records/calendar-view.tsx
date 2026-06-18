'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MyRecordCard } from './my-record-card'
import { ShareButton } from '@/presentation/components/diary/share-button'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  runs: RunLog[]
  memberId: string
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayStr() {
  const d = new Date()
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

export function CalendarView({ runs, memberId }: Props) {
  const router = useRouter()
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selected, setSelected]   = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)

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

  const runDateSet = new Set(runs.map(r => r.date))
  const selectedRuns = selected ? runs.filter(r => r.date === selected) : []

  const firstDow   = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7

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
    <div style={{ paddingBottom: 40 }}>
      {/* Month navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '0 22px 12px', background: '#fff', borderRadius: 16, padding: '12px 18px',
      }}>
        <button type="button" onClick={prevMonth} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '1.4rem', color: '#888', lineHeight: 1, padding: '2px 6px',
        }}>‹</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.9rem', fontWeight: 500, color: '#111111',
          }}>
            {viewYear}년 {viewMonth + 1}월
          </div>
          <ShareButton
            url={`${typeof window !== 'undefined' ? window.location.origin : ''}/diary/${memberId}/${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`}
            title={`${viewYear}.${viewMonth + 1} 달리기 일기`}
            text={`${viewYear}.${viewMonth + 1} 한 달 기록을 봐줘`}
          >
            <span aria-label="이 달 일기 공유" style={{ fontSize: '1.1rem' }}>↗</span>
          </ShareButton>
        </div>
        <button type="button" onClick={nextMonth} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '1.4rem', color: '#888', lineHeight: 1, padding: '2px 6px',
        }}>›</button>
      </div>

      {/* Calendar grid */}
      <div style={{ margin: '0 22px 20px', background: '#fff', borderRadius: 16, padding: '16px 10px 12px' }}>
        {/* Day-of-week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: '0.58rem', fontWeight: 600,
              color: i === 0 ? '#FC5252' : i === 6 ? '#111111' : '#aaa',
              paddingBottom: 4,
            }}>{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: totalCells }, (_, idx) => {
            const day = idx - firstDow + 1
            if (day < 1 || day > daysInMonth) return <div key={idx} />
            const dateStr  = toDateStr(viewYear, viewMonth, day)
            const hasRun   = runDateSet.has(dateStr)
            const isSel    = selected === dateStr
            const isTdy    = dateStr === today
            const col      = idx % 7

            return (
              <div
                key={idx}
                onClick={() => hasRun && setSelected(isSel ? null : dateStr)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '3px 2px', cursor: hasRun ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.78rem',
                  fontWeight: isTdy ? 700 : 400,
                  background: isSel ? '#111111' : isTdy ? '#f0f0f0' : 'transparent',
                  color: isSel ? '#fff'
                    : col === 0 ? '#FC5252'
                    : col === 6 ? '#111111'
                    : '#111111',
                  transition: 'background 0.15s',
                }}>{day}</div>
                <div style={{
                  width: 4, height: 4, borderRadius: '50%', marginTop: 2,
                  background: hasRun ? (isSel ? '#111111' : '#111111') : 'transparent',
                  opacity: hasRun ? 1 : 0,
                }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected date records */}
      {selected ? (
        <div>
          <div style={{
            padding: '0 22px 12px',
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.65rem', fontWeight: 500,
            color: '#888', letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>
            {selected} 기록
          </div>
          {selectedRuns.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '20px 0', fontSize: '0.875rem' }}>
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
              />
            ))
          )}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#ccc', padding: '12px 0', fontSize: '0.75rem' }}>
          ● 표시된 날짜를 탭하면 기록을 볼 수 있어요
        </p>
      )}
    </div>
  )
}
