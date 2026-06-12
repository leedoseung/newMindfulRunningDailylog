const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function NoActiveChallenge() {
  return (
    <section
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 14, color: '#555', margin: 0, lineHeight: 1.7 }}>
        진행 중인 챌린지가 없어요.<br />
        곧 새 시즌이 공지됩니다.
      </p>
    </section>
  )
}
