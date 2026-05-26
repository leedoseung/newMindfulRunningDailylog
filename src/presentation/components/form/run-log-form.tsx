'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Member } from '@/domain/entities/member'
import { MemberSelect } from './member-select'
import { DurationPicker } from './duration-picker'
import { ThoughtInputs } from './thought-inputs'
import { PhotoUpload } from './photo-upload'
import { createBrowserClient } from '@/infrastructure/supabase/client'

type ThoughtKey = 'before' | 'during' | 'after'

type Props = {
  members: Member[]
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-raleway)', fontSize: '0.6rem', fontWeight: 700,
  color: '#888', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: '10px',
}

const SECTION_STYLE: React.CSSProperties = { padding: '0 22px 18px' }

const TEXT_INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: '#fff', border: 'none', borderRadius: '16px',
  padding: '16px 18px', fontFamily: 'var(--font-roboto)', fontSize: '0.92rem',
  color: '#2d3031', outline: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  boxSizing: 'border-box',
}

export function RunLogForm({ members }: Props) {
  const router = useRouter()
  const [memberId, setMemberId]           = useState('')
  const [date, setDate]                   = useState(() => new Date().toISOString().split('T')[0]!)
  const [durationMin, setDurationMin]     = useState(30)
  const [title, setTitle]                 = useState('')
  const [location, setLocation]           = useState('')
  const [thoughtBefore, setThoughtBefore] = useState('')
  const [thoughtDuring, setThoughtDuring] = useState('')
  const [thoughtAfter, setThoughtAfter]   = useState('')
  const [photoFile, setPhotoFile]         = useState<File | null>(null)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')

  function handleThoughtChange(key: ThoughtKey, value: string) {
    if (key === 'before') setThoughtBefore(value)
    else if (key === 'during') setThoughtDuring(value)
    else setThoughtAfter(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId) { setError('이름을 선택해주세요'); return }
    setSubmitting(true)
    setError('')

    try {
      let photoUrl = ''
      if (photoFile) {
        const supabase = createBrowserClient()
        const ext = photoFile.name.split('.').pop() ?? 'jpg'
        const path = `${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('run-photos')
          .upload(path, photoFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`)
        const { data: urlData } = supabase.storage.from('run-photos').getPublicUrl(uploadData.path)
        photoUrl = urlData.publicUrl
      }

      const res = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId, date, durationMin, title,
          thoughtBefore, thoughtDuring, thoughtAfter,
          location, photoUrl,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? '저장 실패')
      }
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ paddingBottom: '40px' }}>

      {/* 이름 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>이름</div>
        <MemberSelect members={members} value={memberId} onChange={setMemberId} />
      </div>

      {/* 날짜 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>날짜</div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.57rem', fontWeight: 500, color: '#888', marginBottom: '3px' }}>날짜</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.92rem', fontWeight: 700, color: '#2d3031', border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
          />
        </div>
      </div>

      {/* 달린 시간 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>달린 시간</div>
        <DurationPicker value={durationMin} onChange={setDurationMin} />
      </div>

      {/* 장소 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>장소</div>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="어디서 달리셨나요?"
          style={TEXT_INPUT_STYLE}
        />
      </div>

      {/* 오늘의 한 줄 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>오늘의 한 줄</div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value.slice(0, 40))}
          placeholder="달리기를 한 줄로 표현한다면?"
          style={{ ...TEXT_INPUT_STYLE, fontFamily: 'var(--font-raleway)', fontWeight: 700 }}
        />
        <div style={{ textAlign: 'right', fontSize: '0.62rem', color: '#888', padding: '4px 4px 0' }}>
          {title.length} / 40
        </div>
      </div>

      {/* 달리기 전·중·후 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>달리기 전 · 중 · 후</div>
        <ThoughtInputs
          before={thoughtBefore}
          during={thoughtDuring}
          after={thoughtAfter}
          onChange={handleThoughtChange}
        />
      </div>

      {/* 사진 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>사진 (선택)</div>
        <PhotoUpload file={photoFile} onChange={setPhotoFile} />
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div style={{ padding: '0 22px 10px', color: '#ef4444', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {/* 제출 버튼 */}
      <div style={{ padding: '0 22px' }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', padding: '16px',
            background: submitting ? '#888' : '#2d3031',
            border: 'none', borderRadius: '16px',
            fontFamily: 'var(--font-raleway)', fontSize: '0.9rem', fontWeight: 700,
            color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
            letterSpacing: '0.5px',
            boxShadow: '0 6px 20px rgba(45,48,49,0.2)',
            transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {submitting ? '저장 중...' : '기록 저장하기'}
        </button>
      </div>
    </form>
  )
}
