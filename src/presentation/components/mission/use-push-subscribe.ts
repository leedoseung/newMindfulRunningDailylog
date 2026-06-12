'use client'

import { useCallback, useState } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export type PushSubscribeState = 'idle' | 'unsupported' | 'denied' | 'subscribed' | 'pending' | 'error'

export function usePushSubscribe() {
  const [state, setState] = useState<PushSubscribeState>('idle')
  const [error, setError] = useState<string | null>(null)

  const subscribe = useCallback(async () => {
    setError(null)
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    setState('pending')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''),
      })

      const json = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setState('error')
        setError(err.error ?? 'unknown')
        return
      }
      setState('subscribed')
    } catch (e) {
      setState('error')
      setError(String(e))
    }
  }, [])

  return { state, error, subscribe }
}
