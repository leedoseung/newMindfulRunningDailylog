'use client'

import { useState, useEffect } from 'react'
import { AvatarImage } from '../shared/avatar-image'
import type { Comment } from '@/domain/entities/comment'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  runId: string
  open: boolean
  onClose: () => void
  memberId?: string
  memberName?: string
  memberAvatarUrl?: string
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export function CommentsSheet({ runId, open, onClose, memberId, memberName = '', memberAvatarUrl = '' }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/record/${runId}/comments`)
      .then(r => r.json())
      .then(d => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, runId])

  async function handleSubmit() {
    const trimmed = body.trim()
    if (!trimmed || !memberId || submitting) return
    setSubmitting(true)
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      memberId,
      memberName,
      memberAvatarUrl,
      body: trimmed,
      createdAt: new Date().toISOString(),
    }
    setComments(prev => [...prev, optimistic])
    setBody('')
    try {
      const res = await fetch(`/api/record/${runId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })
      if (!res.ok) throw new Error('failed')
      const created: Comment = await res.json()
      setComments(prev => prev.map(c => c.id === optimistic.id ? created : c))
    } catch {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('failed')
    } catch {
      fetch(`/api/record/${runId}/comments`)
        .then(r => r.json())
        .then(d => setComments(d.comments ?? []))
        .catch(() => {})
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: open ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
          transition: 'background 0.3s',
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        zIndex: 301,
        background: '#1c1c1c',
        borderRadius: '22px 22px 0 0',
        height: '60vh',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.55)',
      }}>
        {/* Handle */}
        <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 28, height: 3, background: 'rgba(255,255,255,0.18)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px 12px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontFamily: FONT, fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
            댓글 {comments.length}개
          </span>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: '0.78rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '6px 0' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', fontFamily: FONT, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
              불러오는 중...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', fontFamily: FONT, fontSize: '0.85rem', color: 'rgba(255,255,255,0.22)' }}>
              첫 번째 댓글을 남겨보세요 👟
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, padding: '10px 20px', alignItems: 'flex-start' }}>
                <AvatarImage name={c.memberName} avatarUrl={c.memberAvatarUrl} size={32} bg="rgba(255,255,255,0.1)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <span style={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                      {c.memberName}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', flexShrink: 0, marginLeft: 8 }}>
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: '0.86rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                    {c.body}
                  </div>
                </div>
                {c.memberId === memberId && (
                  <button
                    type="button"
                    aria-label="댓글 삭제"
                    onClick={() => handleDelete(c.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: 'rgba(255,255,255,0.22)', fontSize: '0.7rem', flexShrink: 0,
                    }}
                  >✕</button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        {memberId ? (
          <div style={{
            flexShrink: 0, padding: '10px 16px 18px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <AvatarImage name={memberName} avatarUrl={memberAvatarUrl} size={30} bg="rgba(255,255,255,0.1)" />
            <input
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
              placeholder="댓글 달기..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none',
                borderRadius: 20, padding: '8px 14px',
                fontFamily: FONT, fontSize: 16, color: '#fff', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!body.trim() || submitting}
              style={{
                background: 'none', border: 'none', flexShrink: 0,
                fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600,
                color: body.trim() ? '#60a5fa' : 'rgba(255,255,255,0.2)',
                cursor: body.trim() ? 'pointer' : 'default',
                padding: '0 4px',
              }}
            >게시</button>
          </div>
        ) : (
          <div style={{
            flexShrink: 0, padding: '16px 20px 20px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            textAlign: 'center',
            fontFamily: FONT, fontSize: '0.8rem', color: 'rgba(255,255,255,0.28)',
          }}>
            로그인이 필요합니다
          </div>
        )}
      </div>
    </>
  )
}
