'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShareCard } from './share-card'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  run: RunLog | null
  open: boolean
  onClose: () => void
  memberId?: string
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

export function DetailSheet({ run, open, onClose, memberId }: Props) {
  const router = useRouter()
  const [photoMode, setPhotoMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)
  const count = useCountUp(run?.durationMin ?? 0, open)

  const isOwner = Boolean(memberId && run && run.memberId === memberId)

  function handleEdit() {
    if (!run) return
    onClose()
    router.push(`/record?edit=${run.id}`)
  }

  async function handleDelete() {
    if (!run) return
    if (!confirm('이 기록을 삭제할까요?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/record/${run.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      onClose()
      router.refresh()
    } catch {
      alert('삭제에 실패했습니다')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!open) setPhotoMode(false)
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
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
      })

      const fileName = `mindful-run-${run.date}.png`

      // iOS / Android → 네이티브 공유 시트
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }

      // 데스크탑 → 직접 다운로드
      const link = document.createElement('a')
      link.download = fileName
      link.href = dataUrl
      link.click()
    } catch (err) {
      // 사용자가 공유 취소한 경우(AbortError)는 무시
      if (err instanceof Error && err.name !== 'AbortError') {
        alert('이미지 저장에 실패했습니다')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!run) return null

  const hasPhoto = Boolean(run.photoUrl)

  const thoughts = [
    { step: '전', text: run.thoughtBefore },
    { step: '중', text: run.thoughtDuring },
    { step: '후', text: run.thoughtAfter },
  ].filter(t => t.text)

  return (
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
          background: '#F7F7F5', borderRadius: '28px 28px 0 0',
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.52s cubic-bezier(0.32,0.72,0,1)',
          overflow: 'hidden', zIndex: 201,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Photo background (photo mode) */}
        {hasPhoto && (
          <div
            onClick={() => photoMode && setPhotoMode(false)}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${run.photoUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              transform: photoMode ? 'scale(1.04)' : 'scale(1.12)',
              opacity: photoMode ? 1 : 0,
              transition: 'transform 0.55s cubic-bezier(0.32,0.72,0,1), opacity 0.35s',
              pointerEvents: photoMode ? 'auto' : 'none',
              zIndex: 10,
              cursor: 'pointer',
            }}
          />
        )}

        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px 0', flexShrink: 0, position: 'relative', zIndex: 20,
        }}>
          {/* Handle */}
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            width: 32, height: 3, background: 'rgba(0,0,0,0.12)', borderRadius: 2 }} />

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', marginTop: 8,
              background: '#EBEBEA', border: 'none', color: '#111',
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
                    background: '#111', border: 'none', borderRadius: 20,
                    padding: '6px 14px', fontFamily: FONT, fontSize: '0.6rem',
                    fontWeight: 500, color: '#fff', cursor: 'pointer',
                  }}
                >수정</button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: deleting ? '#ddd' : '#fee2e2', border: 'none', borderRadius: 20,
                    padding: '6px 14px', fontFamily: FONT, fontSize: '0.6rem',
                    fontWeight: 500, color: deleting ? '#aaa' : '#ef4444',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                >{deleting ? '삭제 중…' : '삭제'}</button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {hasPhoto && (
              <button
                type="button"
                onClick={() => setPhotoMode(v => !v)}
                style={{
                  background: '#111', border: 'none', borderRadius: 20,
                  padding: '6px 14px',
                  fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                  color: '#fff', cursor: 'pointer',
                }}
              >{photoMode ? '텍스트 보기' : '사진 보기'}</button>
            )}
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={saving}
              style={{
                background: saving ? '#ddd' : '#EBEBEA', border: 'none', borderRadius: 20,
                padding: '6px 14px',
                fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                color: saving ? '#aaa' : '#111',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >{saving ? '저장 중…' : '이미지 저장'}</button>
            <button
              type="button"
              onClick={handleCopyText}
              style={{
                background: copied ? '#111' : '#EBEBEA', border: 'none', borderRadius: 20,
                padding: '6px 14px',
                fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                color: copied ? '#fff' : '#111',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >{copied ? '복사됨 ✓' : '텍스트 복사'}</button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', scrollbarWidth: 'none',
          padding: '24px 24px 40px',
          opacity: photoMode ? 0 : 1,
          transition: 'opacity 0.25s',
          pointerEvents: photoMode ? 'none' : 'auto',
        }}>
          {/* Duration */}
          <div style={{
            fontFamily: FONT, fontSize: '0.52rem', fontWeight: 500,
            color: '#888', letterSpacing: '2px', textTransform: 'uppercase',
            marginBottom: 4,
          }}>달린 시간</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{
              fontFamily: FONT, fontSize: '4.2rem', fontWeight: 300,
              color: '#111', lineHeight: 1, letterSpacing: '-2px',
            }}>{count}</span>
            <span style={{ fontFamily: FONT, fontSize: '1rem', fontWeight: 400, color: '#555' }}>분</span>
          </div>

          <div style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 400, color: '#666', marginBottom: 16 }}>
            {run.memberName}
          </div>

          {/* Chips */}
          {(run.location || hasPhoto) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {run.location && (
                <div style={{
                  background: '#EBEBEA', borderRadius: 20, padding: '4px 12px',
                  fontFamily: FONT, fontSize: '0.62rem', fontWeight: 400, color: '#555',
                }}>📍 {run.location}</div>
              )}
              {hasPhoto && (
                <div style={{
                  background: '#EBEBEA', borderRadius: 20, padding: '4px 12px',
                  fontFamily: FONT, fontSize: '0.62rem', fontWeight: 400, color: '#555',
                }}>📸 사진</div>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

          {/* Date + title */}
          <div style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 400, color: '#999', marginBottom: 8 }}>
            {run.date}
          </div>
          {run.title && (
            <div style={{
              fontFamily: FONT, fontSize: '1.15rem', fontWeight: 500,
              color: '#111', lineHeight: 1.35, marginBottom: 24,
            }}>"{run.title}"</div>
          )}

          {/* Thoughts */}
          {thoughts.length > 0 && (
            <>
              <div style={{
                fontFamily: FONT, fontSize: '0.5rem', fontWeight: 500,
                color: '#999', letterSpacing: '2px', textTransform: 'uppercase',
                marginBottom: 14,
              }}>Before · During · After</div>
              {thoughts.map(({ step, text }) => (
                <div key={step} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  paddingBottom: 16, marginBottom: 16,
                  borderBottom: '1px solid rgba(0,0,0,0.07)',
                }}>
                  <div style={{
                    fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                    color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
                    whiteSpace: 'nowrap', paddingTop: 3, minWidth: 24,
                  }}>{step}</div>
                  <div style={{
                    fontFamily: FONT, fontSize: '0.88rem', fontWeight: 400,
                    color: '#333', lineHeight: 1.7,
                  }}>{text}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Photo mode tap hint */}
        {hasPhoto && (
          <div style={{
            position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '7px 16px',
            fontFamily: FONT, fontSize: '0.58rem', fontWeight: 500,
            color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap',
            opacity: photoMode ? 1 : 0, transition: 'opacity 0.3s',
            pointerEvents: 'none', zIndex: 20,
          }}>탭하면 텍스트 다시 보기</div>
        )}
      </div>

      {/* 오프스크린 ShareCard — html-to-image 캡처 전용 */}
      <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none', zIndex: -1 }}>
        <ShareCard ref={shareCardRef} run={run} />
      </div>
    </div>
  )
}
