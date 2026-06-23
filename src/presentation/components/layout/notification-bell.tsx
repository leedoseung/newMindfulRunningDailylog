'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AvatarImage } from '../shared/avatar-image'
import { DetailSheet } from '../feed/detail-sheet'
import type { Notification } from '@/domain/entities/notification'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

type Props = {
  memberId: string
  memberName: string
  memberAvatarUrl: string
}

export function NotificationBell({ memberId, memberName, memberAvatarUrl }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<RunLog | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const d = await res.json() as { notifications: Notification[] }
      setNotifications(d.notifications)
    } catch { /* silent */ }
  }, [])

  // Poll only when tab is visible; fetch immediately on focus/visibilitychange.
  // Cuts CPU on Vercel Fluid by skipping background tabs (idle users were the main burner).
  useEffect(() => {
    fetchNotifications()
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id) return
      id = setInterval(fetchNotifications, 180000) // 3 min
    }
    const stop = () => {
      if (id) { clearInterval(id); id = null }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications()
        start()
      } else {
        stop()
      }
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', fetchNotifications)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', fetchNotifications)
    }
  }, [fetchNotifications])

  async function handleOpen() {
    setOpen(true)
    if (unreadCount > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      await fetch('/api/notifications/read', { method: 'PATCH' })
    }
  }

  async function handleNotificationClick(n: Notification) {
    setOpen(false)
    if (n.type === 'challenge_announcement') {
      const url = n.payload?.url ?? '/mission'
      if (typeof window !== 'undefined') window.location.href = url
      return
    }
    if (!n.runLogId) return
    try {
      const res = await fetch(`/api/record/${n.runLogId}`)
      if (!res.ok) return
      setSelectedRun(await res.json() as RunLog)
    } catch { /* silent */ }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="알림"
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: 1, right: 1,
            minWidth: 15, height: 15, borderRadius: 8,
            background: '#FF3B30', color: '#fff',
            fontFamily: FONT, fontSize: '0.48rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            border: '1.5px solid rgba(247,247,245,0.9)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {mounted && open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#fff', borderRadius: '20px 20px 0 0',
              maxHeight: '75vh', display: 'flex', flexDirection: 'column',
            }}
          >
            {/* 핸들 */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E0' }} />
            </div>

            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 10px' }}>
              <span style={{ fontFamily: FONT, fontSize: '0.95rem', fontWeight: 600, color: '#111' }}>알림</span>
              <button type="button" onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#bbb', fontSize: '1.2rem', lineHeight: 1, padding: 4,
              }}>✕</button>
            </div>

            {/* 알림 목록 */}
            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 44 }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '48px 0', textAlign: 'center',
                  fontFamily: FONT, fontSize: '0.82rem', color: '#bbb',
                }}>
                  알림이 없습니다
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '13px 20px', width: '100%',
                      background: n.isRead ? '#fff' : '#F0F6FF',
                      border: 'none', borderBottom: '1px solid rgba(0,0,0,0.05)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {/* 아바타 + 타입 뱃지 */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {n.type === 'challenge_announcement' ? (
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: '#111', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem',
                        }}>🏃</div>
                      ) : (
                        <AvatarImage
                          name={n.actorName ?? ''}
                          avatarUrl={n.actorAvatarUrl ?? ''}
                          size={40}
                          bg="#e5e5e5"
                          color="#888"
                        />
                      )}
                      {n.type !== 'challenge_announcement' && (
                        <div style={{
                          position: 'absolute', bottom: -2, right: -3,
                          width: 17, height: 17, borderRadius: '50%',
                          background: n.type === 'like' ? '#FF3B30' : '#007AFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.55rem', border: '2px solid #fff',
                        }}>
                          {n.type === 'like' ? '♥' : '💬'}
                        </div>
                      )}
                    </div>

                    {/* 텍스트 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {n.type === 'challenge_announcement' ? (
                        <>
                          <div style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#111', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600 }}>새 챌린지 공지</span>
                          </div>
                          {n.payload?.title && (
                            <div style={{
                              fontFamily: FONT, fontSize: '0.72rem', color: '#555',
                              marginTop: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                            }}>
                              {n.payload.title}
                            </div>
                          )}
                          {n.payload?.start_date && (
                            <div style={{
                              fontFamily: FONT, fontSize: '0.7rem', color: '#999', marginTop: 2,
                            }}>
                              시작: {n.payload.start_date}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#111', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600 }}>{n.actorName}</span>
                            {n.type === 'like'
                              ? '님이 회원님의 달리기에 좋아요를 눌렀습니다.'
                              : '님이 댓글을 남겼습니다.'}
                          </div>
                          {n.runTitle && (
                            <div style={{
                              fontFamily: FONT, fontSize: '0.7rem', color: '#999',
                              marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                            }}>
                              &quot;{n.runTitle}&quot;
                            </div>
                          )}
                          {n.type === 'comment' && n.commentBody && (
                            <div style={{
                              fontFamily: FONT, fontSize: '0.72rem', color: '#555',
                              marginTop: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                            }}>
                              {n.commentBody}
                            </div>
                          )}
                        </>
                      )}
                      <div style={{ fontFamily: FONT, fontSize: '0.6rem', color: '#ccc', marginTop: 4 }}>
                        {formatRelativeTime(n.createdAt)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && selectedRun && createPortal(
        <DetailSheet
          run={selectedRun}
          open={Boolean(selectedRun)}
          onClose={() => setSelectedRun(null)}
          memberId={memberId}
          memberName={memberName}
          memberAvatarUrl={memberAvatarUrl}
        />,
        document.body
      )}
    </>
  )
}
