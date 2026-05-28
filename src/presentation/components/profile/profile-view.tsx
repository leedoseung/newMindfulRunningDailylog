'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DetailSheet } from '../feed/detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import { AvatarCropModal } from './avatar-crop-modal'
import { ProfileEditSheet } from './profile-edit-sheet'
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
  memberId: string
}

export function ProfileView({ member, stats, monthlyChart, recentRuns, memberId }: Props) {
  const router = useRouter()
  const [selected, setSelected]       = useState<RunLog | null>(null)
  const [avatarUrl, setAvatarUrl]     = useState(member.avatarUrl)
  const [cropSrc, setCropSrc]         = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [memberInfo, setMemberInfo]   = useState({ name: member.name, generation: member.generation, instaId: member.instaId })
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  async function handleLogout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const maxMinutes = Math.max(...monthlyChart.map(m => m.minutes), 1)

  const statBoxes = [
    { label: '총 달린 시간', value: `${stats.totalHours}h` },
    { label: '총 달린 횟수', value: `${stats.totalCount}` },
    { label: '이번달 시간', value: `${stats.monthHours}h` },
    { label: '이번달 횟수', value: `${stats.monthCount}` },
  ]

  const genLabel = memberInfo.generation
    ? (memberInfo.generation.endsWith('기') ? memberInfo.generation : `${memberInfo.generation}기`)
    : ''

  const chips = [
    member.groupName,
    genLabel,
    memberInfo.instaId && `@${memberInfo.instaId.replace(/^@/, '')}`,
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
      <div style={{
        background: 'linear-gradient(160deg, #1a1a1a 0%, #111111 100%)',
        padding: '56px 24px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 배경 워터마크 */}
        <div style={{
          position: 'absolute', right: -20, top: 30,
          fontFamily: FONT, fontSize: '7rem', fontWeight: 900, letterSpacing: '-4px',
          color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', userSelect: 'none',
          lineHeight: 1,
        }}>RUN</div>

        {/* 아바타 + 이름 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          {/* 아바타 */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #333, #555)',
              padding: 2,
            }}>
              <AvatarImage
                name={memberInfo.name}
                avatarUrl={avatarUrl}
                size={76}
                bg="#2a2a2a"
                style={{ borderRadius: '50%' }}
              />
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>

          {/* 이름 + 소속 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: '0.58rem', fontWeight: 500,
              color: 'rgba(255,255,255,0.4)', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: 6,
            }}>Mindful Running</div>
            <div style={{
              fontFamily: FONT, fontSize: '1.6rem', fontWeight: 700,
              color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1.1,
              marginBottom: 6,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {memberInfo.name}
            </div>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)',
              fontWeight: 400, lineHeight: 1.4,
            }}>
              {[member.groupName, genLabel].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* 칩 + 버튼 하단 한 줄 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {chips.map(chip => (
              <div key={chip} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 20, padding: '5px 12px',
                fontSize: '0.65rem', fontWeight: 500,
                color: 'rgba(255,255,255,0.75)',
              }}>{chip}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                fontFamily: FONT, fontSize: '0.65rem', fontWeight: 500, color: '#ffffff',
              }}
            >수정</button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                fontFamily: FONT, fontSize: '0.65rem', fontWeight: 400,
                color: 'rgba(255,255,255,0.45)',
              }}
            >로그아웃</button>
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: '0.62rem', color: '#888' }}>월별 달린 시간</span>
            <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: '#bbb' }}>최근 6개월</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
            {monthlyChart.map(({ label, minutes, isCurrent }) => {
              const BAR_MAX = 56
              const barHeight = minutes > 0
                ? Math.max(Math.round((minutes / maxMinutes) * BAR_MAX), 10)
                : 3
              return (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%', height: barHeight,
                    borderRadius: '4px 4px 0 0',
                    background: isCurrent ? '#111111' : (minutes > 0 ? '#c8c8c8' : '#efefef'),
                  }} />
                  <div style={{
                    fontSize: '0.52rem', color: isCurrent ? '#111' : '#aaa',
                    fontWeight: isCurrent ? 600 : 400,
                  }}>{label}월</div>
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
