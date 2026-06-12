const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export type Badge = {
  challenge_id: string
  challenge_title: string
  completed_at: string
}

export function ChallengeBadge({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null
  return (
    <section style={{ fontFamily: FONT, padding: 16 }}>
      <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em', margin: '0 0 10px' }}>BADGES</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 8, overflowX: 'auto' }}>
        {badges.map(b => (
          <li
            key={b.challenge_id}
            style={{
              background: '#fff', border: '1px solid #EBEBEB',
              borderRadius: 12, padding: 12, minWidth: 140,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'url(/icon-192.png) center / 28px no-repeat',
                filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(4200%) hue-rotate(355deg) brightness(0.85)',
                marginBottom: 8,
              }}
            />
            <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{b.challenge_title}</p>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{b.completed_at.slice(0, 10)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
