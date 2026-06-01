'use client'

import { useState, useEffect } from 'react'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  runId: string
  likeCount: number
  commentCount: number
  memberId?: string
  hasPhoto?: boolean
  onCommentOpen: () => void
}

export function LikeCommentBar({ runId, likeCount, commentCount, memberId, hasPhoto = true, onCommentOpen }: Props) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(likeCount)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!memberId) return
    fetch(`/api/record/${runId}/like`)
      .then(r => r.json())
      .then(d => { setLiked(d.liked); setCount(d.likeCount) })
      .catch(() => {})
  }, [runId, memberId])

  async function handleLike() {
    if (!memberId || pending) return
    const prev = { liked, count }
    const newLiked = !liked
    setPending(true)
    setLiked(newLiked)
    setCount(c => newLiked ? c + 1 : c - 1)
    try {
      const res = await fetch(`/api/record/${runId}/like`, { method: 'POST' })
      if (!res.ok) throw new Error('like failed')
      const d = await res.json()
      setLiked(d.liked)
      setCount(d.likeCount)
    } catch {
      setLiked(prev.liked)
      setCount(prev.count)
    } finally {
      setPending(false)
    }
  }

  const barBg = hasPhoto ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.05)'
  const borderColor = hasPhoto ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const textColor = hasPhoto ? 'rgba(255,255,255,0.55)' : '#888'

  return (
    <div style={{
      flexShrink: 0,
      background: barBg,
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${borderColor}`,
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 20,
      position: 'relative', zIndex: 20,
    }}>
      <button
        type="button"
        aria-label={liked ? '좋아요 취소' : '좋아요'}
        onClick={handleLike}
        disabled={!memberId || pending}
        style={{
          background: 'none', border: 'none', padding: 0,
          cursor: memberId ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{
          display: 'flex',
          transition: 'transform 0.15s cubic-bezier(0.34,1.5,0.64,1)',
          transform: liked ? 'scale(1.25)' : 'scale(1)',
          color: liked ? '#ed4956' : (hasPhoto ? 'rgba(255,255,255,0.85)' : '#444'),
        }}>
          {liked ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          )}
        </span>
        <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textColor }}>{count}</span>
      </button>

      <button
        type="button"
        aria-label="댓글 보기"
        onClick={onCommentOpen}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          color: hasPhoto ? 'rgba(255,255,255,0.85)' : '#444',
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textColor }}>{commentCount}</span>
      </button>
    </div>
  )
}
