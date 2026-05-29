'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DurationPicker } from './duration-picker'
import { ThoughtInputs } from './thought-inputs'
import { PhotoUpload } from './photo-upload'
import { DetailSheet } from '../feed/detail-sheet'
import { createBrowserClient } from '@/infrastructure/supabase/browser-client'
import { LoadingOverlay } from '../shared/loading-overlay'

type ThoughtKey = 'before' | 'during' | 'after'

type RunLogFormInitial = {
  date: string
  durationMin: number
  title: string
  location: string
  thoughtBefore: string
  thoughtDuring: string
  thoughtAfter: string
  photoUrl: string
}

type Props = {
  memberId: string
  memberName?: string
  memberAvatarUrl?: string
  mode?: 'create' | 'edit'
  recordId?: string
  initialData?: RunLogFormInitial
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.6rem', fontWeight: 500,
  color: '#888', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: '10px',
}

const SECTION_STYLE: React.CSSProperties = { padding: '0 22px 18px' }

const TEXT_INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: '#fff', border: 'none', borderRadius: '16px',
  padding: '16px 18px', fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.92rem',
  color: '#111111', outline: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  boxSizing: 'border-box',
}

export function RunLogForm({ memberId, memberName = '', memberAvatarUrl = '', mode = 'create', recordId, initialData }: Props) {
  const router = useRouter()
  const [date, setDate]                   = useState(() => initialData?.date ?? new Date().toISOString().split('T')[0]!)
  const [durationMin, setDurationMin]     = useState(initialData?.durationMin ?? 30)
  const [title, setTitle]                 = useState(initialData?.title ?? '')
  const [location, setLocation]           = useState(initialData?.location ?? '')
  const [thoughtBefore, setThoughtBefore] = useState(initialData?.thoughtBefore ?? '')
  const [thoughtDuring, setThoughtDuring] = useState(initialData?.thoughtDuring ?? '')
  const [thoughtAfter, setThoughtAfter]   = useState(initialData?.thoughtAfter ?? '')
  const [photoFile, setPhotoFile]         = useState<File | null>(null)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')
  const [previewOpen, setPreviewOpen]     = useState(false)
  const photoObjectUrlRef                 = useRef<string | null>(null)

  // photoFile이 바뀔 때 object URL 생성/해제
  useEffect(() => {
    if (photoObjectUrlRef.current) URL.revokeObjectURL(photoObjectUrlRef.current)
    photoObjectUrlRef.current = photoFile ? URL.createObjectURL(photoFile) : null
    return () => {
      if (photoObjectUrlRef.current) URL.revokeObjectURL(photoObjectUrlRef.current)
    }
  }, [photoFile])

  const previewRun = {
    id: 'preview',
    memberId,
    memberName: memberName || '나',
    memberAvatarUrl,
    memberInstaId: '',
    date,
    durationMin,
    title,
    thoughtBefore,
    thoughtDuring,
    thoughtAfter,
    location,
    photoUrl: photoObjectUrlRef.current ?? initialData?.photoUrl ?? '',
    createdAt: new Date().toISOString(),
  }

  function handleThoughtChange(key: ThoughtKey, value: string) {
    if (key === 'before') setThoughtBefore(value)
    else if (key === 'during') setThoughtDuring(value)
    else setThoughtAfter(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      let photoUrl = initialData?.photoUrl ?? ''
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

      const payload = { memberId, date, durationMin, title, thoughtBefore, thoughtDuring, thoughtAfter, location, photoUrl }

      const url    = mode === 'edit' ? `/api/record/${recordId}` : '/api/record'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? '저장 실패')
      }
      const saved = await res.json()
      sessionStorage.setItem('openRun', JSON.stringify(saved))
      router.refresh()
      router.push('/home')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <LoadingOverlay
      show={submitting}
      message={mode === 'edit' ? '수정 중...' : '저장 중...'}
    />
    <form onSubmit={handleSubmit} style={{ paddingBottom: '40px' }}>

      {/* 날짜 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>날짜</div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.57rem', fontWeight: 500, color: '#888', marginBottom: '3px' }}>날짜</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.92rem', fontWeight: 500, color: '#111111', border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
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
          style={{ ...TEXT_INPUT_STYLE, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontWeight: 500 }}
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

      {error && (
        <div style={{ padding: '0 22px 10px', color: '#ef4444', fontSize: '0.8rem' }}>{error}</div>
      )}

      <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          style={{
            width: '100%', padding: '15px',
            background: 'transparent',
            border: '1.5px solid #ddd', borderRadius: '16px',
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.9rem', fontWeight: 500,
            color: '#555', cursor: 'pointer',
          }}
        >
          미리보기
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', padding: '16px',
            background: submitting ? '#888' : '#111111',
            border: 'none', borderRadius: '16px',
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.9rem', fontWeight: 500,
            color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 6px 20px rgba(45,48,49,0.2)',
          }}
        >
          {submitting ? '저장 중...' : mode === 'edit' ? '수정 완료' : '기록 저장하기'}
        </button>
      </div>
    </form>

    <DetailSheet
      run={previewRun}
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
    />
    </>
  )
}
