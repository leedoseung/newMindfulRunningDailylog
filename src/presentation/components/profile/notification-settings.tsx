'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePushSubscribe } from '../mission/use-push-subscribe'
import { IOSInstallGuideSheet } from '../mission/ios-install-guide-sheet'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type State = 'unknown' | 'unsupported' | 'on' | 'off' | 'denied'

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

async function detectState(): Promise<State> {
  if (typeof window === 'undefined') return 'unknown'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

export function NotificationSettings() {
  const [state, setState] = useState<State>('unknown')
  const [showIosSheet, setShowIosSheet] = useState(false)
  const push = usePushSubscribe()

  const refresh = useCallback(async () => {
    setState(await detectState())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, push.state])

  const handleToggle = useCallback(async () => {
    if (state === 'on') {
      await push.unsubscribe()
      await refresh()
      return
    }
    if (isIOSWithoutPWA()) {
      setShowIosSheet(true)
      return
    }
    await push.subscribe()
    await refresh()
  }, [state, push, refresh])

  if (state === 'unknown') return null

  const baseCard: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #EBEBEB',
    borderRadius: 18,
    padding: 18,
    fontFamily: FONT,
    margin: '12px 16px',
  }

  if (state === 'unsupported') {
    return (
      <section style={baseCard}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>알림</h3>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          이 브라우저에서는 웹 푸시 알림을 지원하지 않습니다. iOS Safari의 경우 홈 화면에 추가하면 알림을 받을 수 있습니다.
        </p>
      </section>
    )
  }

  if (state === 'denied') {
    return (
      <section style={baseCard}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>알림 차단됨</h3>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          브라우저 설정에서 이 사이트의 알림 권한을 허용으로 바꾼 뒤 다시 시도해주세요.
        </p>
      </section>
    )
  }

  const isOn = state === 'on'
  const pending = push.state === 'pending'

  return (
    <>
      <section style={baseCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              미션 알림
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
              {isOn ? '매일 저녁 8시에 미션 리마인더가 전송됩니다.' : '알림을 켜면 매일 저녁 8시에 리마인더를 보내드려요.'}
            </p>
            {push.state === 'error' && push.error && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b8231f' }}>
                오류: {push.error}
              </p>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isOn}
            aria-label={isOn ? '알림 끄기' : '알림 켜기'}
            onClick={handleToggle}
            disabled={pending}
            style={{
              position: 'relative',
              width: 52, height: 30,
              borderRadius: 999,
              border: 'none',
              background: pending ? '#bbb' : (isOn ? '#1e7e34' : '#d6d6d6'),
              cursor: pending ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              padding: 0, flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3, left: isOn ? 25 : 3,
                width: 24, height: 24,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>
      </section>
      <IOSInstallGuideSheet open={showIosSheet} onClose={() => setShowIosSheet(false)} />
    </>
  )
}
