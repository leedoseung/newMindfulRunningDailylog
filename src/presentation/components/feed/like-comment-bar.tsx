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
    setPending(true)
    setLiked(l => !l)
    setCount(c => liked ? c - 1 : c + 1)
    try {
      const res = await fetch(`/api/record/${runId}/like`, { method: 'POST' })
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
          fontSize: '1.25rem',
          transition: 'transform 0.15s cubic-bezier(0.34,1.5,0.64,1)',
          transform: liked ? 'scale(1.25)' : 'scale(1)',
          display: 'block',
        }}>
          {liked ? '❤️' : '🤍'}
        </span>
        {count > 0 && (
          <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textColor }}>{count}</span>
        )}
      </button>

      <button
        type="button"
        aria-label="댓글 보기"
        onClick={onCommentOpen}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ fontSize: '1.15rem' }}>💬</span>
        {commentCount > 0 && (
          <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textColor }}>{commentCount}</span>
        )}
      </button>
    </div>
  )
}
