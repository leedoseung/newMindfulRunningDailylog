'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { RunLog } from '@/domain/entities/run-log'
import { LoadingOverlay } from '../shared/loading-overlay'
import { LikeCommentBar } from './like-comment-bar'
import { CommentsSheet } from './comments-sheet'

const ShareCard = dynamic(
  () => import('./share-card').then(m => m.ShareCard),
  { ssr: false }
)

type Props = {
  run: RunLog | null
  open: boolean
  onClose: () => void
  memberId?: string
  memberName?: string
  memberAvatarUrl?: string
  onDeleted?: (id: string) => void
}

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!active) { setValue(0); return }
    timerRef.current = setTimeout(() => {
      const t0 = performance.now()
      const duration = 800
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1)
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
        setValue(Math.round(e * target))
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }, 180)
    return () => {
      clearTimeout(timerRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [target, active])

  return value
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function DetailSheet({ run, open, onClose, memberId, memberName = '', memberAvatarUrl = '', onDeleted }: Props) {
  const router = useRouter()
  const [photoFull, setPhotoFull] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [overlay, setOverlay] = useState<{ success: boolean; message: string } | null>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const dragStartYRef = useRef(0)
  const shareCardRef = useRef<HTMLDivElement>(null)
  const photoDataUrlRef = useRef<string | null>(null)
  const count = useCountUp(run?.durationMin ?? 0, open)

  function handleDragStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (touch) dragStartYRef.current = touch.clientY
    setIsDragging(true)
  }

  function handleDragMove(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    const delta = touch.clientY - dragStartYRef.current
    if (delta > 0) setDragY(delta)
  }

  function handleDragEnd() {
    setIsDragging(false)
    if (dragY > 120) {
      onClose()
      setTimeout(() => setDragY(0), 520)
    } else {
      setDragY(0)
    }
  }

  // 사진 URL이 바뀔 때마다 data URL로 프리패치 (이미지 저장 속도 향상)
  useEffect(() => {
    if (!run?.photoUrl) { photoDataUrlRef.current = null; return }
    let cancelled = false
    fetch(run.photoUrl)
      .then(r => r.blob())
      .then(blob => new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(blob)
      }))
      .then(url => { if (!cancelled) photoDataUrlRef.current = url })
      .catch(() => {})
    return () => { cancelled = true }
  }, [run?.photoUrl])

  const isOwner = Boolean(memberId && run && run.memberId === memberId)
  const hasPhoto = Boolean(run?.photoUrl)

  function handleEdit() {
    if (!run) return
    onClose()
    router.push(`/?edit=${run.id}`)
  }

  async function handleDelete() {
    if (!run) return
    if (!confirm('이 기록을 삭제할까요?')) return
    setDeleting(true)
    setOverlay({ success: false, message: '삭제 중...' })
    try {
      const res = await fetch(`/api/record/${run.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      setOverlay({ success: true, message: '삭제됐어요' })
      await new Promise<void>(r => setTimeout(r, 1100))
      setOverlay(null)
      onDeleted?.(run.id)
      onClose()
      router.refresh()
    } catch {
      setOverlay(null)
      alert('삭제에 실패했습니다')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('detail-open')
    } else {
      document.body.style.overflow = ''
      document.body.classList.remove('detail-open')
      setPhotoFull(false)
      setDragY(0)
      setIsDragging(false)
      setCommentsOpen(false)
    }
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('detail-open')
    }
  }, [open])

  async function handleCopyText() {
    if (!run) return
    const text = `📝 오늘의 마인드풀러닝 기록

${run.memberName} | ${run.date} | ${run.durationMin}분${run.location ? ` | ${run.location}` : ''}

🏃 오늘의 한줄: ${run.title}

💭 달리기 전:
${run.thoughtBefore}

🏃‍♂️ 달리기 중:
${run.thoughtDuring}

✨ 달리기 후:
${run.thoughtAfter}`

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSaveImage() {
    if (!shareCardRef.current || !run) return
    setSaving(true)
    setOverlay({ success: false, message: '이미지 저장 중...' })
    try {
      // 1) html-to-image 모듈 먼저 로드 (첫 호출 시 async → React 리렌더 허용 구간)
      const { toPng } = await import('html-to-image')

      // 2) 사진 data URL 확보 (우선순위: 프리패치 캐시 → Canvas 추출 → fetch 폴백)
      let photoDataUrl = photoDataUrlRef.current

      if (run.photoUrl && !photoDataUrl) {
        // 2a) ShareCard img 요소가 이미 로드돼 있으면 Canvas로 추출 (네트워크 불필요)
        const shareImg = shareCardRef.current.querySelector<HTMLImageElement>('img[data-photo]')
        if (shareImg) {
          if (!(shareImg.complete && shareImg.naturalWidth > 0)) {
            await new Promise<void>(resolve => {
              shareImg.addEventListener('load', () => resolve(), { once: true })
              shareImg.addEventListener('error', () => resolve(), { once: true })
              setTimeout(resolve, 8000)
            })
          }
          if (shareImg.naturalWidth > 0) {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = shareImg.naturalWidth
              canvas.height = shareImg.naturalHeight
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(shareImg, 0, 0)
                photoDataUrl = canvas.toDataURL('image/jpeg', 0.92)
              }
            } catch { /* canvas tainted → fetch 폴백 */ }
          }
        }
        // 2b) Canvas 실패 시 fetch 폴백
        if (!photoDataUrl) {
          try {
            const blob = await fetch(run.photoUrl).then(r => r.blob())
            photoDataUrl = await new Promise<string>((res, rej) => {
              const reader = new FileReader()
              reader.onload = () => res(reader.result as string)
              reader.onerror = rej
              reader.readAsDataURL(blob)
            })
          } catch { /* 실패 시 원래 URL로 진행 */ }
        }
      }

      // 3) photo src 교체 (data URL 확보된 경우)
      if (photoDataUrl) {
        const photoImg = shareCardRef.current.querySelector<HTMLImageElement>('img[data-photo]')
        if (photoImg) photoImg.src = photoDataUrl
      }

      // 4) 모든 이미지(photo 포함) 로드 완료 대기
      const allImgs = Array.from(
        shareCardRef.current.querySelectorAll<HTMLImageElement>('img')
      )
      await Promise.all(allImgs.map(img => new Promise<void>(resolve => {
        if (img.complete && img.naturalWidth > 0) { resolve(); return }
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
        setTimeout(resolve, 10_000)
      })))

      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2,
        cacheBust: false,
        skipFonts: true,
      })

      const fileName = `mindful-run-${run.date}.png`

      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        setOverlay(null)
        await navigator.share({ files: [file] })
        return
      }

      const link = document.createElement('a')
      link.download = fileName
      link.href = dataUrl
      link.click()
      setOverlay({ success: true, message: '저장됐어요' })
      await new Promise<void>(r => setTimeout(r, 1100))
      setOverlay(null)
    } catch (err) {
      setOverlay(null)
      if (err instanceof Error && err.name !== 'AbortError') {
        alert('이미지 저장에 실패했습니다')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!run) return null

  const thoughts = [
    { step: '전', text: run.thoughtBefore },
    { step: '중', text: run.thoughtDuring },
    { step: '후', text: run.thoughtAfter },
  ].filter(t => t.text)

  // 사진 있을 때 UI 색상
  const onPhoto = hasPhoto
  const labelColor  = onPhoto ? 'rgba(255,255,255,0.55)' : '#888'
  const bigNumColor = onPhoto ? '#ffffff' : '#111'
  const unitColor   = onPhoto ? 'rgba(255,255,255,0.7)' : '#555'
  const nameColor   = onPhoto ? 'rgba(255,255,255,0.75)' : '#666'
  const chipBg      = onPhoto ? 'rgba(255,255,255,0.15)' : '#EBEBEA'
  const chipColor   = onPhoto ? 'rgba(255,255,255,0.85)' : '#555'
  const dividerBg   = onPhoto ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
  const dateColor   = onPhoto ? 'rgba(255,255,255,0.5)' : '#999'
  const titleColor  = onPhoto ? '#ffffff' : '#111'
  const bdaColor    = onPhoto ? 'rgba(255,255,255,0.45)' : '#999'
  const stepColor   = onPhoto ? 'rgba(255,255,255,0.55)' : '#888'
  const bodyColor   = onPhoto ? 'rgba(255,255,255,0.9)' : '#333'
  const rowBorder   = onPhoto ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'
  const handleColor = onPhoto ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)'
  const closeBg     = onPhoto ? 'rgba(0,0,0,0.35)' : '#EBEBEA'
  const closeColor  = onPhoto ? '#fff' : '#111'
  const btnBg       = onPhoto ? 'rgba(0,0,0,0.35)' : '#EBEBEA'
  const btnColor    = onPhoto ? '#fff' : '#111'

  return (
    <>
    <LoadingOverlay
      show={overlay !== null}
      success={overlay?.success ?? false}
      message={overlay?.message}
    />
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      pointerEvents: open ? 'all' : 'none',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        data-testid="detail-sheet-backdrop"
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: open ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0)',
          transition: 'background 0.38s ease',
        }}
      />

      {/* Sheet */}
      <div
        data-testid="detail-sheet"
        style={{
          position: 'relative', width: '100%', height: '88vh',
          background: hasPhoto ? '#111' : '#F7F7F5',
          borderRadius: '28px 28px 0 0',
          transform: !open ? 'translateY(110%)' : dragY > 0 ? `translateY(${dragY}px)` : 'translateY(0)',
          transition: isDragging ? 'none' : 'transform 0.52s cubic-bezier(0.32,0.72,0,1)',
          overflow: 'hidden', zIndex: 201,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Photo — always in background when hasPhoto */}
        {hasPhoto && (
          <div
            onClick={() => setPhotoFull(v => !v)}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${run.photoUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              zIndex: 0,
              cursor: 'pointer',
              transition: 'transform 0.55s cubic-bezier(0.32,0.72,0,1)',
              transform: photoFull ? 'scale(1.03)' : 'scale(1)',
            }}
          />
        )}

        {/* Dark overlay — dims photo so text is readable; hides in fullscreen mode */}
        {hasPhoto && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.65) 100%)',
            opacity: photoFull ? 0 : 1,
            transition: 'opacity 0.35s',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        )}

        {/* Drag handle zone — full-width touch target */}
        <div
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          style={{
            position: 'relative', width: '100%', height: 28, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20, touchAction: 'none', cursor: 'grab',
          }}
        >
          <div style={{
            width: 32, height: 3, background: handleColor, borderRadius: 2,
          }} />
        </div>

        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px 0', flexShrink: 0,
          position: 'relative', zIndex: 20,
          opacity: photoFull ? 0 : 1,
          transition: 'opacity 0.25s',
          pointerEvents: photoFull ? 'none' : 'auto',
        }}>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', marginTop: 8,
              background: closeBg, border: 'none', color: closeColor,
              fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>

          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  style={{
                    background: onPhoto ? 'rgba(255,255,255,0.18)' : '#111',
                    border: onPhoto ? '1px solid rgba(255,255,255,0.25)' : 'none',
                    borderRadius: 20, padding: '6px 14px',
                    fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                    color: '#fff', cursor: 'pointer',
                  }}
                >수정</button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: deleting ? 'rgba(0,0,0,0.2)' : (onPhoto ? 'rgba(239,68,68,0.25)' : '#fee2e2'),
                    border: onPhoto ? '1px solid rgba(239,68,68,0.4)' : 'none',
                    borderRadius: 20, padding: '6px 14px',
                    fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                    color: deleting ? '#aaa' : '#ef4444',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                >{deleting ? '삭제 중…' : '삭제'}</button>
              </>
            )}
          </div>

          {isOwner && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={saving}
                style={{
                  background: saving ? 'rgba(0,0,0,0.2)' : btnBg,
                  border: onPhoto ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  borderRadius: 20, padding: '6px 14px',
                  fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                  color: saving ? '#aaa' : btnColor,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >{saving ? '저장 중…' : '이미지 저장'}</button>
              <button
                type="button"
                onClick={handleCopyText}
                style={{
                  background: copied ? (onPhoto ? 'rgba(255,255,255,0.9)' : '#111') : btnBg,
                  border: onPhoto ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  borderRadius: 20, padding: '6px 14px',
                  fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                  color: copied ? (onPhoto ? '#111' : '#fff') : btnColor,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >{copied ? '복사됨 ✓' : '텍스트 복사'}</button>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', scrollbarWidth: 'none',
          padding: '24px 24px 40px',
          position: 'relative', zIndex: 10,
          opacity: photoFull ? 0 : 1,
          transition: 'opacity 0.25s',
          pointerEvents: photoFull ? 'none' : 'auto',
        }}>
          <div style={{
            fontFamily: FONT, fontSize: '0.52rem', fontWeight: 500,
            color: labelColor, letterSpacing: '2px', textTransform: 'uppercase',
            marginBottom: 4,
          }}>달린 시간</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{
              fontFamily: FONT, fontSize: '4.2rem', fontWeight: 300,
              color: bigNumColor, lineHeight: 1, letterSpacing: '-2px',
            }}>{count}</span>
            <span style={{ fontFamily: FONT, fontSize: '1rem', fontWeight: 400, color: unitColor }}>분</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 400, color: nameColor }}>
              {run.memberName}
            </div>
            {run.memberInstaId && (
              <a
                href={`https://instagram.com/${run.memberInstaId.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: chipBg, borderRadius: 20, padding: '3px 10px',
                  fontFamily: FONT, fontSize: '0.58rem', fontWeight: 500,
                  color: chipColor, textDecoration: 'none',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                </svg>
                @{run.memberInstaId.replace(/^@/, '')}
              </a>
            )}
          </div>

          {run.location && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{
                background: chipBg, borderRadius: 20, padding: '4px 12px',
                fontFamily: FONT, fontSize: '0.62rem', fontWeight: 400, color: chipColor,
              }}>📍 {run.location}</div>
            </div>
          )}

          <div style={{ height: 1, background: dividerBg, marginBottom: 20 }} />

          <div style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 400, color: dateColor, marginBottom: 8 }}>
            {run.date}
          </div>
          {run.title && (
            <div style={{
              fontFamily: FONT, fontSize: '1.15rem', fontWeight: 500,
              color: titleColor, lineHeight: 1.35, marginBottom: 24,
            }}>"{run.title}"</div>
          )}

          {thoughts.length > 0 && (
            <>
              <div style={{
                fontFamily: FONT, fontSize: '0.5rem', fontWeight: 500,
                color: bdaColor, letterSpacing: '2px', textTransform: 'uppercase',
                marginBottom: 14,
              }}>Before · During · After</div>
              {thoughts.map(({ step, text }) => (
                <div key={step} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  paddingBottom: 16, marginBottom: 16,
                  borderBottom: `1px solid ${rowBorder}`,
                }}>
                  <div style={{
                    fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                    color: stepColor, textTransform: 'uppercase', letterSpacing: '0.5px',
                    whiteSpace: 'nowrap', paddingTop: 3, minWidth: 24,
                  }}>{step}</div>
                  <div style={{
                    fontFamily: FONT, fontSize: '0.88rem', fontWeight: 400,
                    color: bodyColor, lineHeight: 1.7,
                  }}>{text}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Fullscreen photo hint */}
        {hasPhoto && (
          <div style={{
            position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '7px 16px',
            fontFamily: FONT, fontSize: '0.58rem', fontWeight: 500,
            color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap',
            opacity: photoFull ? 1 : 0, transition: 'opacity 0.3s',
            pointerEvents: 'none', zIndex: 20,
          }}>탭하면 텍스트 다시 보기</div>
        )}

        {/* Like / Comment action bar */}
        <LikeCommentBar
          runId={run.id}
          likeCount={run.likeCount}
          commentCount={run.commentCount}
          memberId={memberId}
          hasPhoto={hasPhoto}
          onCommentOpen={() => setCommentsOpen(true)}
        />
      </div>

      {/* 오프스크린 ShareCard — html-to-image 캡처 전용 */}
      <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none', zIndex: -1 }}>
        <ShareCard ref={shareCardRef} run={run} />
      </div>
    </div>

      {/* Comments sheet — layered above the detail sheet */}
      <CommentsSheet
        runId={run.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        memberId={memberId}
        memberName={memberName}
        memberAvatarUrl={memberAvatarUrl}
      />
    </>
  )
}
