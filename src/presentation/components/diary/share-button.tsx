'use client'

import { useState, type ReactNode } from 'react'

type Props = { url: string; title: string; text: string; children?: ReactNode; variant?: 'light' | 'dark' }

export function ShareButton({ url, title, text, children, variant = 'dark' }: Props) {
  const [toast, setToast] = useState<string | null>(null)

  async function onClick() {
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ url, title, text })
        return
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url)
      setToast('링크 복사됨')
      setTimeout(() => setToast(null), 1500)
    } catch {
      setToast('복사 실패')
      setTimeout(() => setToast(null), 1500)
    }
  }

  const variantStyles = variant === 'light'
    ? { background: 'rgba(0,0,0,0.05)', color: '#444', border: '1px solid rgba(0,0,0,0.08)', padding: '8px 14px' }
    : { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 24px' }

  return (
    <>
      <button type="button" onClick={onClick} style={{
        ...variantStyles,
        borderRadius: 999, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
        minHeight: 44, fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
      }}>
        {children ?? '↗ 공유하기'}
      </button>
      {toast && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '10px 16px', borderRadius: 999,
          fontSize: '0.85rem', zIndex: 1000,
        }}>{toast}</div>
      )}
    </>
  )
}
