'use client'

import { createPortal } from 'react-dom'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  show: boolean
  success?: boolean
  message?: string
}

export function LoadingOverlay({ show, success = false, message = '처리 중...' }: Props) {
  if (!show || typeof document === 'undefined') return null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.52)',
      backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18,
    }}>
      <style>{`@keyframes _lov_spin { to { transform: rotate(360deg) } }`}</style>

      {success ? (
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', color: '#fff',
        }}>✓</div>
      ) : (
        <div style={{
          width: 46, height: 46,
          border: '3px solid rgba(255,255,255,0.15)',
          borderTop: '3px solid #fff',
          borderRadius: '50%',
          animation: '_lov_spin 0.75s linear infinite',
        }} />
      )}

      <div style={{
        fontFamily: FONT, fontSize: '0.88rem', fontWeight: 500,
        color: 'rgba(255,255,255,0.88)', letterSpacing: '0.3px',
      }}>
        {message}
      </div>
    </div>,
    document.body
  )
}
