'use client'

import { useEffect } from 'react'

export function SWRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('SW register failed', err)
    })
  }, [])
  return null
}
