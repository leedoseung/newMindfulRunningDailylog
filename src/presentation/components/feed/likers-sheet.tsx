'use client'

import { useState, useEffect } from 'react'
import { AvatarImage } from '../shared/avatar-image'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Liker = { id: string; name: string; avatarUrl?: string }

type Props = {
  runId: string
  open: boolean
  onClose: () => void
}

export function LikersSheet({ runId, open, onClose }: Props) {
  const [likers, setLikers] = useState<Liker[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/record/${runId}/like/likers`)
      .then(r => r.json())
      .then(d => setLikers(d.likers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, runId])

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
        maxHeight: '50vh',
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
            좋아요 {likers.length}개
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
          ) : likers.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', fontFamily: FONT, fontSize: '0.85rem', color: 'rgba(255,255,255,0.22)' }}>
              아직 좋아요가 없어요
            </div>
          ) : (
            likers.map(liker => (
              <div key={liker.id} style={{ display: 'flex', gap: 12, padding: '10px 20px', alignItems: 'center' }}>
                <AvatarImage name={liker.name} avatarUrl={liker.avatarUrl} size={36} bg="rgba(255,255,255,0.1)" />
                <span style={{ fontFamily: FONT, fontSize: '0.88rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                  {liker.name}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
