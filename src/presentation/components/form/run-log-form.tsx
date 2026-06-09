'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DurationPicker } from './duration-picker'
import { ThoughtInputs } from './thought-inputs'
import { PhotoUpload } from './photo-upload'
import { DetailSheet } from '../feed/detail-sheet'
import { createBrowserClient } from '@/infrastructure/supabase/browser-client'
import { LoadingOverlay } from '../shared/loading-overlay'

async function compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  // createImageBitmap reads EXIF orientation so portrait iPhone photos aren't stored rotated
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('canvas toBlob failed')), 'image/jpeg', quality)
  })
}

type ThoughtKey = 'before' | 'during' | 'after'

type RunLogFormInitial = {
  date: string
  runTime?: string | null
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
  padding: '16px 18px', fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1rem',
  color: '#111111', outline: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  boxSizing: 'border-box',
}

export function RunLogForm({ memberId, memberName = '', memberAvatarUrl = '', mode = 'create', recordId, initialData }: Props) {
  const router = useRouter()
  const draftKey = `run-log-draft-${memberId}`

  const [date, setDate]                   = useState(() => {
    if (initialData?.date) return initialData.date
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [runTime, setRunTime]             = useState<string>(initialData?.runTime ?? '')
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
  const [draftRestored, setDraftRestored] = useState(false)
  const photoObjectUrlRef                 = useRef<string | null>(null)
  const draftTimerRef                     = useRef<ReturnType<typeof setTimeout>>(undefined)

  // create 모드: 마운트 시 드래프트 복원
  useEffect(() => {
    if (mode !== 'create') return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const d = JSON.parse(raw) as Record<string, unknown>
      const hasContent = d.title || d.thoughtBefore || d.thoughtDuring || d.thoughtAfter || d.location
      if (!hasContent) return
      if (typeof d.date === 'string') setDate(d.date)
      if (typeof d.runTime === 'string') setRunTime(d.runTime)
      if (typeof d.durationMin === 'number') setDurationMin(d.durationMin)
      if (typeof d.title === 'string') setTitle(d.title)
      if (typeof d.location === 'string') setLocation(d.location)
      if (typeof d.thoughtBefore === 'string') setThoughtBefore(d.thoughtBefore)
      if (typeof d.thoughtDuring === 'string') setThoughtDuring(d.thoughtDuring)
      if (typeof d.thoughtAfter === 'string') setThoughtAfter(d.thoughtAfter)
      setDraftRestored(true)
      setTimeout(() => setDraftRestored(false), 3500)
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // create 모드: 필드 변경 시 800ms 디바운스 자동저장
  useEffect(() => {
    if (mode !== 'create') return
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(
          { date, runTime, durationMin, title, location, thoughtBefore, thoughtDuring, thoughtAfter }
        ))
      } catch { /* storage quota 초과 무시 */ }
    }, 800)
    return () => clearTimeout(draftTimerRef.current)
  }, [mode, draftKey, date, runTime, durationMin, title, location, thoughtBefore, thoughtDuring, thoughtAfter])

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
    runTime: runTime || null,
    durationMin,
    title,
    thoughtBefore,
    thoughtDuring,
    thoughtAfter,
    location,
    photoUrl: photoObjectUrlRef.current ?? initialData?.photoUrl ?? '',
    rawPhotoUrl: null,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
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
        const compressed = await compressImage(photoFile, 1200, 0.82)
        const supabase = createBrowserClient()
        const path = `${Date.now()}.jpg`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('run-photos')
          .upload(path, compressed, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
        if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`)
        const { data: urlData } = supabase.storage.from('run-photos').getPublicUrl(uploadData.path)
        photoUrl = urlData.publicUrl
      }

      const payload = { memberId, date, runTime: runTime || null, durationMin, title, thoughtBefore, thoughtDuring, thoughtAfter, location, photoUrl }

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
      localStorage.removeItem(draftKey)
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
    {draftRestored && (
      <div style={{
        position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
        background: '#111', color: '#fff', borderRadius: 20,
        padding: '8px 18px', fontSize: '0.72rem', fontWeight: 500,
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
        zIndex: 300, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        pointerEvents: 'none',
      }}>
        임시저장된 내용을 불러왔습니다
      </div>
    )}
    <form onSubmit={handleSubmit} style={{ paddingBottom: '40px' }}>

      {/* 날짜 + 시간 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>날짜 · 시간</div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.57rem', fontWeight: 500, color: '#888', marginBottom: '3px' }}>날짜</div>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1rem', fontWeight: 500, color: '#111111', border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
            />
          </div>
          <div style={{ width: 1, background: '#f0f0f0', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.57rem', fontWeight: 500, color: '#888', marginBottom: '3px' }}>시작 시간 (선택)</div>
            <input
              type="time"
              value={runTime}
              onChange={e => setRunTime(e.target.value)}
              style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1rem', fontWeight: 500, color: runTime ? '#111111' : '#bbb', border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
            />
          </div>
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
