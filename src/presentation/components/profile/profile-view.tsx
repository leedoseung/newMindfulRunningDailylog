'use client'

import { useRef, useState } from 'react'
import { DetailSheet } from '../feed/detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import { AvatarCropModal } from './avatar-crop-modal'
import { createBrowserClient } from '@/infrastructure/supabase/browser-client'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Member = { name: string; groupName: string; generation: string; instaId: string; avatarUrl: string }
type Stats  = { totalHours: number; monthHours: number; totalCount: number; monthCount: number }
type MonthEntry = { key: string; label: string; minutes: number; isCurrent: boolean }

type Props = {
  member: Member
  stats: Stats
  monthlyChart: MonthEntry[]
  recentRuns: RunLog[]
}

export function ProfileView({ member, stats, monthlyChart, recentRuns }: Props) {
  const [selected, setSelected]       = useState<RunLog | null>(null)
  const [avatarUrl, setAvatarUrl]     = useState(member.avatarUrl)
  const [cropSrc, setCropSrc]         = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

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

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5' }}>
      {/* Hero */}
      <div style={{ background: '#111111', padding: '52px 22px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', right: -10, bottom: -10,
          fontSize: '8rem', opacity: 0.06, pointerEvents: 'none', userSelect: 'none',
        }}>🏃</div>

        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 14 }}>
          {/* Tappable avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AvatarImage
              name={member.name}
              avatarUrl={avatarUrl}
              size={72}
              bg="#333"
              style={{ border: '2px solid rgba(255,255,255,0.15)' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: '50%',
                background: uploading ? '#555' : '#fff',
                border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            >{uploading ? '···' : '📷'}</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>

          <div>
            <div style={{
              fontFamily: FONT, fontSize: '1.8rem', fontWeight: 500,
              color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 4,
            }}>
              {member.name}<br />
              <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#555' }}>의 기록</em>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#555' }}>
              마인드풀러닝 · {member.generation}기 · {member.groupName}
            </div>
          </div>
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
              fontFamily: FONT, fontSize: '1.6rem', fontWeight: 500,
              color: '#111111', display: 'block', marginBottom: 3,
            }}>{value}</span>
            <span style={{ fontSize: '0.62rem', color: '#888' }}>{label}</span>
          </div>
        ))}

        {/* Monthly bar chart */}
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
                    background: isCurrent ? '#111111' : '#EBEBEB',
                  }} />
                  <div style={{ fontSize: '0.5rem', color: '#888' }}>{label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent runs */}
      <div style={{ padding: '18px 22px 12px' }}>
        <div style={{
          fontFamily: FONT, fontSize: '0.65rem', fontWeight: 500,
          color: '#888', letterSpacing: '1.8px', textTransform: 'uppercase',
        }}>최근 기록</div>
      </div>

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
              <div style={{ fontSize: '0.55rem', fontWeight: 500, color: '#888', marginBottom: 6 }}>
                {run.date}
              </div>
              <div style={{ fontFamily: FONT, fontSize: '0.76rem', fontWeight: 500, color: '#111', marginBottom: 8, lineHeight: 1.3 }}>
                {run.title || '달리기'}
              </div>
              <span style={{ fontFamily: FONT, fontSize: '1.3rem', fontWeight: 300, color: '#111' }}>{run.durationMin}</span>
              <span style={{ fontSize: '0.6rem', color: '#888' }}> 분</span>
            </div>
          ))
        )}
      </div>

      {selected && (
        <DetailSheet run={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
      )}

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onComplete={handleCropComplete}
          onCancel={() => { setCropSrc(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
        />
      )}
    </main>
  )
}
