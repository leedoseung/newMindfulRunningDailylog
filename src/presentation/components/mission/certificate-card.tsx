'use client'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  memberName: string
  challengeTitle: string
  completedAt: string
  durationDays: number
}

export function CertificateCard({ memberName, challengeTitle, completedAt, durationDays }: Props) {
  const dateLabel = new Date(completedAt).toISOString().slice(0, 10)

  async function share() {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({
          title: `${memberName} · ${durationDays}일 완주`,
          text: `${challengeTitle} 완주!`,
          url: window.location.href,
        })
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('링크 복사됨')
      } catch {
        alert('공유 미지원 브라우저')
      }
    }
  }

  return (
    <article
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '2px solid #111',
        borderRadius: 20,
        padding: 32,
        textAlign: 'center',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.1em', margin: 0 }}>CERTIFICATE</p>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '12px 0 4px' }}>
        {durationDays}일 완주
      </h1>
      <p style={{ fontSize: 13, color: '#555', margin: '0 0 28px' }}>{challengeTitle}</p>
      <div style={{
        background: 'url(/icon-192.png) center / 120px no-repeat',
        height: 120, marginBottom: 20,
        filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(4200%) hue-rotate(355deg) brightness(0.85)',
      }} aria-hidden />
      <p style={{ fontSize: 14, color: '#888', margin: 0 }}>참가자</p>
      <p style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 20px' }}>{memberName}</p>
      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>완료일</p>
      <p style={{ fontSize: 13, color: '#111', margin: '4px 0 28px' }}>{dateLabel}</p>
      <button
        type="button"
        onClick={share}
        style={{
          width: '100%', padding: '14px 0',
          background: '#111', color: '#fff',
          border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
        }}
      >
        공유하기
      </button>
    </article>
  )
}
