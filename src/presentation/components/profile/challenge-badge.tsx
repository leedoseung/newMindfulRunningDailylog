import {
  ACHIEVEMENT_ORDER,
  getAchievement,
  type AchievementCode,
} from '@/domain/badges/achievement-catalog'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export type BadgeStats = {
  total_logs?: number
  run_days?: number
  rest_days?: number
  passes_used?: number
  max_streak?: number
  total_reps?: number
  revived?: boolean
}

export type Badge = {
  challenge_id: string
  challenge_title: string
  completed_at: string
  achievements?: string[]
  stats?: BadgeStats
}

function sortAchievements(codes: string[]): string[] {
  const rank = new Map(ACHIEVEMENT_ORDER.map((c, i) => [c as string, i]))
  return [...codes].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99))
}

function AchievementChip({ code }: { code: string }) {
  const entry = getAchievement(code)
  if (!entry) return null
  return (
    <li
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#FFF6F5',
        border: '1px solid #FFE9E7',
        borderRadius: 999,
        padding: '5px 10px',
        fontSize: 12,
        fontWeight: 600,
        color: '#7c2d12',
        letterSpacing: '-0.02em',
      }}
      title={entry.hint}
    >
      <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>{entry.icon}</span>
      {entry.label}
    </li>
  )
}

function BadgeCard({ badge }: { badge: Badge }) {
  const codes = sortAchievements(badge.achievements ?? ['finisher'])
  const stats = badge.stats

  return (
    <li
      style={{
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 16,
        padding: 16,
        minWidth: 260,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'url(/icon-192.png) center / 32px no-repeat',
            filter:
              'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(4200%) hue-rotate(355deg) brightness(0.85)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            {badge.challenge_title}
          </p>
          <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>
            {badge.completed_at.slice(0, 10)}
          </p>
        </div>
      </div>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        {codes.map(c => <AchievementChip key={c} code={c} />)}
      </ul>

      {stats && (
        <p
          style={{
            fontSize: 11,
            color: '#666',
            margin: '10px 0 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.5,
          }}
        >
          {stats.total_reps != null && <>총 런지 {stats.total_reps.toLocaleString()}회</>}
          {stats.max_streak != null && <> · 최장 연속 {stats.max_streak}일</>}
          {stats.rest_days != null && stats.rest_days > 0 && <> · 쉬어간 {stats.rest_days}일</>}
        </p>
      )}
    </li>
  )
}

export function ChallengeBadge({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null
  return (
    <section style={{ fontFamily: FONT, padding: 16 }}>
      <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em', margin: '0 0 10px' }}>BADGES</p>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
        }}
      >
        {badges.map(b => <BadgeCard key={b.challenge_id} badge={b} />)}
      </ul>
    </section>
  )
}

// Named export for tests to render one card.
export function _BadgeCard(props: { badge: Badge }) {
  return <BadgeCard {...props} />
}

export type { AchievementCode }
