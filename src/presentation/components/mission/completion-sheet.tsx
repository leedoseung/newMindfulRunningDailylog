'use client'

import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = { open: boolean; participationId: string; onClose: () => void }

export function CompletionSheet({ open, participationId, onClose }: Props) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, fontFamily: FONT, padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 24, padding: 28, textAlign: 'center' }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }} aria-hidden>🏆</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          100일 완주!
        </h2>
        <p style={{ fontSize: 13, color: '#555', margin: '12px 0 24px', lineHeight: 1.6 }}>
          매일 100개 × 100일 = 10,000개의 런지를 완주하셨어요.
        </p>
        <Link
          href={`/mission/certificate/${participationId}`}
          style={{
            display: 'block', width: '100%', padding: '14px 0',
            background: '#111', color: '#fff', textDecoration: 'none',
            borderRadius: 12, fontSize: 15, fontWeight: 600,
          }}
        >
          인증서 보기
        </Link>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', marginTop: 10, padding: '12px 0',
            background: 'transparent', color: '#888',
            border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: FONT,
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
