'use client'

type Props = { open: boolean; onClose: () => void }

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function IOSInstallGuideSheet({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>알림 받기 위해</h2>
        <p style={{ fontSize: 13, color: '#555', margin: '8px 0 20px', lineHeight: 1.6 }}>
          iOS Safari 는 PWA 로 설치된 앱만 푸시 알림을 받을 수 있어요.
        </p>
        <ol style={{ fontSize: 13, color: '#111', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>하단 공유 버튼 (□↑) 탭</li>
          <li>&quot;홈 화면에 추가&quot; 선택</li>
          <li>홈 화면 아이콘으로 앱 다시 열기</li>
          <li>알림 권한 허용</li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', marginTop: 24,
            padding: '14px 0', background: '#111', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
            fontFamily: FONT, cursor: 'pointer',
          }}
        >
          알겠어요
        </button>
      </div>
    </div>
  )
}
