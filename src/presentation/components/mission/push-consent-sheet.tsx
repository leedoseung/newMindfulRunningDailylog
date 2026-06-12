'use client'

type Props = {
  open: boolean
  onAllow: () => void
  onLater: () => void
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function PushConsentSheet({ open, onAllow, onLater }: Props) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-consent-title"
      onClick={onLater}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-end',
        zIndex: 1000,
        fontFamily: FONT,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: '#fff',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '28px 24px 36px',
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#FFF0EF', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 28, marginBottom: 12,
        }}>🔔</div>
        <h2 id="push-consent-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          미션 알림 받기
        </h2>
        <p style={{ fontSize: 13, color: '#555', margin: '10px 0 24px', lineHeight: 1.6 }}>
          매일 저녁 8시에 런지 100개 미션 리마인더를 보내드려요.<br />
          알림을 끄려면 휴대폰 설정에서 변경할 수 있어요.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={onAllow}
            style={{
              padding: '14px 0', background: '#111', color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
              fontFamily: FONT, cursor: 'pointer',
            }}
          >
            알림 허용
          </button>
          <button
            type="button"
            onClick={onLater}
            style={{
              padding: '14px 0', background: 'transparent', color: '#888',
              border: 'none', fontSize: 14, fontWeight: 500,
              fontFamily: FONT, cursor: 'pointer',
            }}
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}
