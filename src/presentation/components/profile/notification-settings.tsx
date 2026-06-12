'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePushSubscribe } from '../mission/use-push-subscribe'
import { IOSInstallGuideSheet } from '../mission/ios-install-guide-sheet'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Status = 'unknown' | 'unsupported' | 'default' | 'granted' | 'denied'

function detectStatus(): Status {
  if (typeof window === 'undefined') return 'unknown'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  return Notification.permission as Status
}

function isIOSWithoutPWA(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  if (!isIOS) return false
  const isStandalone =
    ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true) ||
    window.matchMedia?.('(display-mode: standalone)').matches
  return !isStandalone
}

export function NotificationSettings() {
  const [status, setStatus] = useState<Status>('unknown')
  const [showIosSheet, setShowIosSheet] = useState(false)
  const push = usePushSubscribe()

  useEffect(() => {
    setStatus(detectStatus())
  }, [push.state])

  const handleClick = useCallback(async () => {
    if (isIOSWithoutPWA()) {
      setShowIosSheet(true)
      return
    }
    await push.subscribe()
    setStatus(detectStatus())
  }, [push])

  if (status === 'unknown') return null

  const baseCard: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #EBEBEB',
    borderRadius: 18,
    padding: 18,
    fontFamily: FONT,
    margin: '12px 16px',
  }

  if (status === 'unsupported') {
    return (
      <section style={baseCard}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>알림</h3>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          이 브라우저에서는 웹 푸시 알림을 지원하지 않습니다. iOS Safari의 경우 홈 화면에 추가하면 알림을 받을 수 있습니다.
        </p>
      </section>
    )
  }

  if (status === 'granted' && push.state === 'subscribed') {
    return (
      <section style={baseCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>알림 켜짐 ✓</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
              매일 저녁 8시에 미션 리마인더가 전송됩니다.
            </p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#1e7e34',
            background: '#E8F5EC', padding: '4px 9px', borderRadius: 999,
          }}>ON</span>
        </div>
      </section>
    )
  }

  if (status === 'denied') {
    return (
      <section style={baseCard}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>알림 차단됨</h3>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          브라우저 설정에서 이 사이트의 알림 권한을 허용으로 바꾼 뒤 다시 시도해주세요.
        </p>
      </section>
    )
  }

  // status === 'granted' but not subscribed yet, OR status === 'default'
  return (
    <>
    <section style={baseCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>미션 알림 받기</h3>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            매일 저녁 8시에 런지 100개 미션 리마인더를 보내드려요.
          </p>
          {push.state === 'denied' && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b8231f' }}>
              브라우저에서 권한을 거부하셨습니다. 설정에서 다시 허용해주세요.
            </p>
          )}
          {push.state === 'error' && push.error && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b8231f' }}>
              오류: {push.error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={push.state === 'pending'}
          style={{
            padding: '10px 16px',
            background: push.state === 'pending' ? '#888' : '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT,
            cursor: push.state === 'pending' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {push.state === 'pending' ? '처리 중...' : '알림 허용'}
        </button>
      </div>
    </section>
    <IOSInstallGuideSheet open={showIosSheet} onClose={() => setShowIosSheet(false)} />
    </>
  )
}
