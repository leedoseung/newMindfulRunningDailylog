'use client'

import { useState } from 'react'
import { DetailSheet } from '../feed/detail-sheet'
import type { RunLog } from '@/domain/entities/run-log'

type Member = { name: string; groupName: string; generation: string; instaId: string }
type Stats  = { totalHours: number; monthHours: number; totalCount: number; monthCount: number }
type MonthEntry = { key: string; label: string; minutes: number; isCurrent: boolean }

type Props = {
  member: Member
  stats: Stats
  monthlyChart: MonthEntry[]
  recentRuns: RunLog[]
}

export function ProfileView({ member, stats, monthlyChart, recentRuns }: Props) {
  const [selected, setSelected] = useState<RunLog | null>(null)

  const maxMinutes = Math.max(...monthlyChart.map(m => m.minutes), 1)

  const statBoxes = [
    { label: '총 달린 시간', value: `${stats.totalHours}h` },
    { label: '총 달린 횟수', value: `${stats.totalCount}` },
    { label: '이번달 시간', value: `${stats.monthHours}h` },
    { label: '이번달 횟수', value: `${stats.monthCount}` },
  ]

  const chips = [
    member.groupName && member.groupName,
    member.generation && `${member.generation}기`,
    member.instaId && `@${member.instaId}`,
  ].filter(Boolean) as string[]

  return (
    <main style={{ minHeight: '100vh', background: '#F4F5F6' }}>
      {/* Hero */}
      <div style={{ background: '#2d3031', padding: '52px 22px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', right: -10, bottom: -10,
          fontSize: '8rem', opacity: 0.06, pointerEvents: 'none', userSelect: 'none',
        }}>🏃</div>
        <div style={{
          fontFamily: 'var(--font-raleway)', fontSize: '2rem', fontWeight: 800,
          color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 4,
        }}>
          {member.name}<br />
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#555' }}>의 기록</em>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: 16 }}>
          마인드풀러닝 · {member.generation}기 · {member.groupName}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {chips.map(chip => (
            <div key={chip} style={{
              background: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: '5px 12px',
              fontSize: '0.64rem', fontWeight: 500, color: '#888',
            }}>{chip}</div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '18px 22px 0' }}>
        {statBoxes.map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 16, padding: 16 }}>
            <span style={{
              fontFamily: 'var(--font-raleway)', fontSize: '1.6rem', fontWeight: 800,
              color: '#2d3031', display: 'block', marginBottom: 3,
            }}>{value}</span>
            <span style={{ fontSize: '0.62rem', color: '#888' }}>{label}</span>
          </div>
        ))}

        {/* Monthly bar chart (wide) */}
        <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 16, padding: 16 }}>
          <span style={{ fontSize: '0.62rem', color: '#888', display: 'block', marginBottom: 4 }}>
            월별 달린 시간
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48, marginTop: 12 }}>
            {monthlyChart.map(({ label, minutes, isCurrent }) => {
              const heightPct = `${Math.max((minutes / maxMinutes) * 100, 4)}%`
              return (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: '100%', height: heightPct,
                    borderRadius: '4px 4px 0 0',
                    background: isCurrent ? '#2d3031' : '#EBEBEB',
                  }} />
                  <div style={{ fontSize: '0.5rem', color: '#888' }}>{label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent runs header */}
      <div style={{ padding: '18px 22px 12px' }}>
        <div style={{
          fontFamily: 'var(--font-raleway)', fontSize: '0.65rem', fontWeight: 700,
          color: '#888', letterSpacing: '1.8px', textTransform: 'uppercase',
        }}>최근 기록</div>
      </div>

      {/* Mini cards horizontal scroll */}
      <div style={{ display: 'flex', gap: 8, padding: '0 22px 40px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {recentRuns.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#888', padding: '20px 0' }}>아직 기록이 없습니다</p>
        ) : (
          recentRuns.map(run => (
            <div
              key={run.id}
              onClick={() => setSelected(run)}
              style={{
                flexShrink: 0, width: 128, background: '#fff', borderRadius: 16,
                padding: '14px 12px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', cursor: 'pointer',
              }}
            >
              <div style={{
                fontSize: '0.55rem', fontWeight: 500, color: '#888',
                marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {run.date}
              </div>
              <div style={{
                fontFamily: 'var(--font-raleway)', fontSize: '0.76rem', fontWeight: 700,
                color: '#2d3031', marginBottom: 8, lineHeight: 1.3,
              }}>
                {run.title || '달리기'}
              </div>
              <span style={{ fontFamily: 'var(--font-raleway)', fontSize: '1.3rem', fontWeight: 800, color: '#2d3031' }}>
                {run.durationMin}
              </span>
              <span style={{ fontSize: '0.6rem', color: '#888' }}> 분</span>
            </div>
          ))
        )}
      </div>

      {selected && (
        <DetailSheet
          run={selected}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  )
}
