'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DetailSheet } from '../feed/detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import dynamic from 'next/dynamic'
const AvatarCropModal = dynamic(
  () => import('./avatar-crop-modal').then(m => m.AvatarCropModal),
  { ssr: false }
)
import { ProfileEditSheet } from './profile-edit-sheet'
import { createBrowserClient } from '@/infrastructure/supabase/browser-client'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Member    = { name: string; groupName: string; generation: string; instaId: string; avatarUrl: string }
type Stats     = { totalHours: number; monthHours: number; totalCount: number; monthCount: number }
type MonthEntry = { key: string; label: string; minutes: number; isCurrent: boolean }
type FilterMode = '4weeks' | 'month' | 'year' | 'custom'

type Props = {
  member: Member
  stats: Stats
  monthlyChart: MonthEntry[]
  recentRuns: RunLog[]
  allRuns: RunLog[]
  memberId: string
}

const fmt = (d: Date) => d.toISOString().split('T')[0]!

export function ProfileView({ member, allRuns, memberId }: Props) {
  const router = useRouter()
  const [selected, setSelected]     = useState<RunLog | null>(null)
  const [avatarUrl, setAvatarUrl]   = useState(member.avatarUrl)
  const [cropSrc, setCropSrc]       = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [memberInfo, setMemberInfo] = useState({ name: member.name, generation: member.generation, instaId: member.instaId })
  const fileInputRef                = useRef<HTMLInputElement>(null)

  // 필터 상태
  const [filterMode, setFilterMode] = useState<FilterMode>('4weeks')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [pendingFrom, setPendingFrom] = useState('')
  const [pendingTo, setPendingTo]     = useState('')

  async function handleLogout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCropComplete(blob: Blob) {
    setCropSrc(null)
    setUploading(true)
    try {
      const supabase = createBrowserClient()
      const path = `${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)
      const newUrl = urlData.publicUrl
      const res = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: newUrl }),
      })
      if (!res.ok) throw new Error('저장 실패')
      setAvatarUrl(newUrl)
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  // ── 날짜 범위 ────────────────────────────────────────────────
  const dateRange = useMemo(() => {
    const today = new Date()
    if (filterMode === '4weeks') {
      const from = new Date(today); from.setDate(today.getDate() - 27)
      return { from: fmt(from), to: fmt(today) }
    }
    if (filterMode === 'month') {
      const y = today.getFullYear(), m = today.getMonth()
      return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) }
    }
    if (filterMode === 'year') {
      return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` }
    }
    return { from: customFrom, to: customTo }
  }, [filterMode, customFrom, customTo])

  const filteredRuns = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return []
    return allRuns.filter(r => r.date >= dateRange.from && r.date <= dateRange.to)
  }, [allRuns, dateRange])

  const filteredStats = useMemo(() => {
    const totalMin = filteredRuns.reduce((s, r) => s + r.durationMin, 0)
    const days = new Set(filteredRuns.map(r => r.date)).size
    return {
      count: filteredRuns.length,
      totalMin,
      days,
      avgMin: filteredRuns.length > 0 ? Math.round(totalMin / filteredRuns.length) : 0,
    }
  }, [filteredRuns])

  const filteredChart = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return []
    const from = new Date(dateRange.from + 'T00:00:00')
    const to   = new Date(dateRange.to   + 'T00:00:00')
    const totalDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
    const todayStr = fmt(new Date())

    if (totalDays <= 35) {
      return Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(from); d.setDate(from.getDate() + i)
        const dateStr = fmt(d)
        const minutes = filteredRuns.filter(r => r.date === dateStr).reduce((s, r) => s + r.durationMin, 0)
        return { label: String(d.getDate()), minutes, isToday: dateStr === todayStr, dateStr }
      })
    }

    // 월별
    const months: Record<string, number> = {}
    filteredRuns.forEach(r => {
      const key = r.date.slice(0, 7)
      months[key] = (months[key] ?? 0) + r.durationMin
    })
    const result: { label: string; minutes: number; isToday: boolean; dateStr: string }[] = []
    const cur = new Date(from.getFullYear(), from.getMonth(), 1)
    const end = new Date(to.getFullYear(), to.getMonth() + 1, 1)
    const nowKey = new Date().toISOString().slice(0, 7)
    while (cur < end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      result.push({ label: `${cur.getMonth() + 1}월`, minutes: months[key] ?? 0, isToday: key === nowKey, dateStr: key })
      cur.setMonth(cur.getMonth() + 1)
    }
    return result
  }, [filteredRuns, dateRange])

  const maxChartMin = Math.max(...filteredChart.map(c => c.minutes), 1)

  const genLabel = memberInfo.generation
    ? (memberInfo.generation.endsWith('기') ? memberInfo.generation : `${memberInfo.generation}기`)
    : ''

  const chips = [
    member.groupName,
    genLabel,
    memberInfo.instaId && `@${memberInfo.instaId.replace(/^@/, '')}`,
  ].filter(Boolean) as string[]

  const FILTER_LABELS: { key: FilterMode; label: string }[] = [
    { key: '4weeks', label: '4주' },
    { key: 'month',  label: '1달' },
    { key: 'year',   label: '1년' },
    { key: 'custom', label: '직접선택' },
  ]

  const statBoxes = [
    { label: '달린 횟수', value: String(filteredStats.count), unit: '회' },
    { label: '달린 시간', value: String(filteredStats.totalMin), unit: '분' },
    { label: '달린 날',   value: String(filteredStats.days),    unit: '일' },
    { label: '평균 시간', value: String(filteredStats.avgMin),  unit: '분/회' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(160deg, #1a1a1a 0%, #111111 100%)',
        padding: '56px 24px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -20, top: 30,
          fontFamily: FONT, fontSize: '7rem', fontWeight: 900, letterSpacing: '-4px',
          color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
        }}>RUN</div>

        {/* 아바타 + 이름 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #333, #555)', padding: 2,
            }}>
              <AvatarImage name={memberInfo.name} avatarUrl={avatarUrl} size={76} bg="#2a2a2a" style={{ borderRadius: '50%' }} />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: uploading ? '#444' : '#ffffff',
                border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >{uploading ? '···' : '📷'}</button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: '0.58rem', fontWeight: 500,
              color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6,
            }}>Mindful Running</div>
            <div style={{
              fontFamily: FONT, fontSize: '1.6rem', fontWeight: 700,
              color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 6,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{memberInfo.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 400, lineHeight: 1.4 }}>
              {[member.groupName, genLabel].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* 칩 + 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {chips.map(chip => {
              const isInsta = chip.startsWith('@')
              const handle = isInsta ? chip.slice(1) : ''
              if (isInsta) {
                return (
                  <a key={chip} href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: 20, padding: '5px 12px',
                      fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
                    }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                      <circle cx="12" cy="12" r="4"/>
                      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                    </svg>
                    {chip}
                  </a>
                )
              }
              return (
                <div key={chip} style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 20, padding: '5px 12px',
                  fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)',
                }}>{chip}</div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={() => setEditOpen(true)} style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
              fontFamily: FONT, fontSize: '0.65rem', fontWeight: 500, color: '#ffffff',
            }}>수정</button>
            <button type="button" onClick={handleLogout} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
              fontFamily: FONT, fontSize: '0.65rem', fontWeight: 400, color: 'rgba(255,255,255,0.45)',
            }}>로그아웃</button>
          </div>
        </div>
      </div>

      {/* ── 필터 바 ── */}
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterMode(key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: FONT, fontSize: '0.68rem', fontWeight: 600,
                background: filterMode === key ? '#111' : '#EBEBEA',
                color: filterMode === key ? '#fff' : '#888',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>

        {/* 직접선택 날짜 입력 */}
        {filterMode === 'custom' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 10, padding: '12px 14px',
            background: '#fff', borderRadius: 12,
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          }}>
            <input
              type="date"
              value={pendingFrom}
              onChange={e => setPendingFrom(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontFamily: FONT, fontSize: '0.78rem', color: '#111',
              }}
            />
            <span style={{ color: '#ccc', fontSize: '0.7rem' }}>~</span>
            <input
              type="date"
              value={pendingTo}
              onChange={e => setPendingTo(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontFamily: FONT, fontSize: '0.78rem', color: '#111',
              }}
            />
            <button
              type="button"
              onClick={() => { setCustomFrom(pendingFrom); setCustomTo(pendingTo) }}
              disabled={!pendingFrom || !pendingTo}
              style={{
                background: (!pendingFrom || !pendingTo) ? '#e5e5e5' : '#111',
                color: (!pendingFrom || !pendingTo) ? '#aaa' : '#fff',
                border: 'none', borderRadius: 8, padding: '6px 12px',
                fontFamily: FONT, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >적용</button>
          </div>
        )}

        {/* 선택된 기간 레이블 */}
        {dateRange.from && dateRange.to && (
          <div style={{
            marginTop: 8, fontSize: '0.6rem', color: '#bbb',
            fontFamily: FONT, letterSpacing: '0.5px',
          }}>
            {dateRange.from} ~ {dateRange.to}
          </div>
        )}
      </div>

      {/* ── 통계 카드 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '14px 22px 0' }}>
        {statBoxes.map(({ label, value, unit }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 16, padding: 16 }}>
            <span style={{
              fontFamily: FONT, fontSize: '1.45rem', fontWeight: 500,
              color: '#111111', display: 'block', marginBottom: 3,
            }}>{value}<span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#999', marginLeft: 3 }}>{unit}</span></span>
            <span style={{ fontSize: '0.62rem', color: '#888' }}>{label}</span>
          </div>
        ))}

        {/* 차트 */}
        <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: '0.62rem', color: '#888' }}>달린 시간</span>
            <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: '#bbb' }}>
              {filteredChart.length <= 35 ? '일별' : '월별'}
            </span>
          </div>

          {filteredChart.length === 0 ? (
            <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#ccc' }}>날짜를 선택해주세요</span>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: filteredChart.length > 20 ? 2 : 4,
              height: 64, overflowX: 'auto', scrollbarWidth: 'none',
            }}>
              {filteredChart.map(({ label, minutes, isToday, dateStr }) => {
                const BAR_MAX = 56
                const barH = minutes > 0 ? Math.max(Math.round((minutes / maxChartMin) * BAR_MAX), 8) : 3
                return (
                  <div key={dateStr} style={{
                    flexShrink: 0,
                    width: filteredChart.length > 20 ? 8 : 'auto',
                    flex: filteredChart.length <= 20 ? 1 : undefined,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <div style={{
                      width: '100%', height: barH, borderRadius: '3px 3px 0 0',
                      background: isToday ? '#111' : (minutes > 0 ? '#c8c8c8' : '#efefef'),
                    }} />
                    {filteredChart.length <= 14 && (
                      <div style={{
                        fontSize: '0.48rem', color: isToday ? '#111' : '#aaa',
                        fontWeight: isToday ? 600 : 400, whiteSpace: 'nowrap',
                      }}>{label}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* 월별일 때만 라벨 별도 표시 */}
          {filteredChart.length > 14 && filteredChart.length <= 35 && (
            <div style={{ display: 'flex', gap: filteredChart.length > 20 ? 2 : 4, marginTop: 4 }}>
              {filteredChart.map(({ label, isToday, dateStr }) => (
                <div key={dateStr} style={{
                  flexShrink: 0,
                  width: filteredChart.length > 20 ? 8 : 'auto',
                  flex: filteredChart.length <= 20 ? 1 : undefined,
                  textAlign: 'center', fontSize: '0.44rem',
                  color: isToday ? '#111' : '#ccc',
                  fontWeight: isToday ? 600 : 400,
                }}>{label}</div>
              ))}
            </div>
          )}
          {filteredChart.length > 35 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {filteredChart.map(({ label, isToday, dateStr }) => (
                <div key={dateStr} style={{
                  flex: 1, textAlign: 'center', fontSize: '0.48rem',
                  color: isToday ? '#111' : '#ccc', fontWeight: isToday ? 600 : 400,
                }}>{label}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 기록 목록 ── */}
      <div style={{ padding: '18px 22px 12px' }}>
        <div style={{
          fontFamily: FONT, fontSize: '0.65rem', fontWeight: 500,
          color: '#888', letterSpacing: '1.8px', textTransform: 'uppercase',
        }}>기록 {filteredRuns.length > 0 ? `· ${filteredRuns.length}개` : ''}</div>
      </div>

      <div style={{ padding: '0 22px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredRuns.length === 0 ? (
          <div style={{
            padding: '32px 0', textAlign: 'center',
            fontSize: '0.82rem', color: '#bbb', fontFamily: FONT,
          }}>이 기간에 달린 기록이 없어요</div>
        ) : (
          filteredRuns.map(run => (
            <div
              key={run.id}
              onClick={() => setSelected(run)}
              style={{
                background: '#fff', borderRadius: 16,
                padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {/* 날짜 */}
              <div style={{
                flexShrink: 0, width: 40, textAlign: 'center',
                background: '#F7F7F5', borderRadius: 10, padding: '6px 4px',
              }}>
                <div style={{ fontFamily: FONT, fontSize: '1.05rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>
                  {run.date.slice(8)}
                </div>
                <div style={{ fontSize: '0.5rem', color: '#aaa', marginTop: 2 }}>
                  {run.date.slice(5, 7)}월
                </div>
              </div>

              {/* 내용 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT, fontSize: '0.82rem', fontWeight: 500, color: '#111',
                  marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {run.title || '달리기'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#888' }}>
                    {run.durationMin}분
                  </span>
                  {run.location && (
                    <span style={{ fontSize: '0.65rem', color: '#bbb' }}>· {run.location}</span>
                  )}
                </div>
              </div>

              {/* 사진 유무 */}
              {run.photoUrl && (
                <div style={{
                  flexShrink: 0, width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={run.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {/* 화살표 */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          ))
        )}
      </div>

      {selected && (
        <DetailSheet run={selected} open={Boolean(selected)} onClose={() => setSelected(null)} memberId={memberId} />
      )}

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onComplete={handleCropComplete}
          onCancel={() => { setCropSrc(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
        />
      )}

      <ProfileEditSheet
        open={editOpen}
        name={memberInfo.name}
        generation={memberInfo.generation}
        instaId={memberInfo.instaId}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => { setMemberInfo(updated); setEditOpen(false) }}
      />
    </main>
  )
}
