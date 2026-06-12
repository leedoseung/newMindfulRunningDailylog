'use client'

type Props = {
  title: string
  description: string
  startDate: string
  registrationDeadline: string
  onEnroll: () => void
  isPending?: boolean
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function EnrollCard({
  title, description, startDate, registrationDeadline, onEnroll, isPending = false,
}: Props) {
  return (
    <section
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: 24,
      }}
    >
      <p style={{ fontSize: 11, color: '#888', margin: 0, letterSpacing: '0.05em' }}>SEASON</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '6px 0 12px' }}>
        {title}
      </h2>
      {description && (
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: '0 0 16px' }}>
          {description}
        </p>
      )}
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '0 0 20px' }}>
        <div>
          <dt style={{ fontSize: 10, color: '#888', letterSpacing: '0.05em' }}>시작일</dt>
          <dd style={{ fontSize: 13, color: '#111', margin: 0, fontWeight: 600 }}>{startDate}</dd>
        </div>
        <div>
          <dt style={{ fontSize: 10, color: '#888', letterSpacing: '0.05em' }}>등록 마감</dt>
          <dd style={{ fontSize: 13, color: '#111', margin: 0, fontWeight: 600 }}>
            {registrationDeadline}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        disabled={isPending}
        onClick={onEnroll}
        style={{
          width: '100%',
          padding: '14px 0',
          fontSize: 15,
          fontWeight: 600,
          fontFamily: FONT,
          background: isPending ? '#888' : '#111',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          cursor: isPending ? 'not-allowed' : 'pointer',
        }}
      >
        {isPending ? '처리 중...' : '참가 신청'}
      </button>
    </section>
  )
}
