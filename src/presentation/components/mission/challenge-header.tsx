type Props = {
  title: string
  todayIndex: number  // -1 if outside season range
  durationDays: number
  streak: number
  passesRemaining: number
  passCount: number
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function ChallengeHeader({
  title, todayIndex, durationDays, streak, passesRemaining, passCount,
}: Props) {
  const dayLabel = todayIndex >= 0 ? `Day ${todayIndex + 1}` : '시작 전'
  const beforeStart = todayIndex < 0

  return (
    <header
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: 18,
      }}
    >
      <p style={{ fontSize: 11, color: '#888', margin: 0, letterSpacing: '0.05em' }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {dayLabel}
        </span>
        {!beforeStart && (
          <span style={{ fontSize: 14, color: '#888', fontWeight: 500 }}>/ {durationDays}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
        <div>
          <p style={{ fontSize: 10, color: '#888', margin: 0, letterSpacing: '0.05em' }}>streak</p>
          <p style={{ fontSize: 14, color: '#111', margin: 0, fontWeight: 600 }}>{streak}일</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: '#888', margin: 0, letterSpacing: '0.05em' }}>면죄권</p>
          <p style={{ fontSize: 14, color: '#111', margin: 0, fontWeight: 600 }}>
            {passesRemaining} / {passCount}
          </p>
        </div>
      </div>
    </header>
  )
}
