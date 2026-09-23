import type { MyChallengeCard } from '@/application/use-cases/get-my-challenge-card'
import {
  ACHIEVEMENT_ORDER,
  getAchievement,
  type AchievementCode,
} from '@/domain/badges/achievement-catalog'
import { FinisherStampLauncher } from '@/presentation/components/mission/finisher-stamp-launcher'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const RANK = new Map(ACHIEVEMENT_ORDER.map((c, i) => [c as string, i]))

function sortCodes(codes: AchievementCode[]): AchievementCode[] {
  return [...codes].sort((a, b) => (RANK.get(a) ?? 99) - (RANK.get(b) ?? 99))
}

export function MyLungeS1Card({ card }: { card: MyChallengeCard }) {
  const codes = sortCodes(card.achievements)
  return (
    <section
      style={{
        margin: '12px 16px 0',
        borderRadius: 22,
        padding: '20px 20px 16px',
        background: '#151114',
        color: '#FBF6ED',
        fontFamily: FONT,
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -60,
          right: -50,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(244,114,182,0.16) 0%, rgba(244,114,182,0) 68%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 2,
              background: '#F4B183',
              borderRadius: 2,
            }}
          />
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.6)',
              margin: 0,
              fontWeight: 700,
            }}
          >
            MY LUNGE 100
          </p>
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '6px 0 4px',
          }}
        >
          {card.memberName}의 100일 완주
        </h2>
        <p
          style={{
            fontSize: 11,
            color: 'rgba(245,240,232,0.55)',
            margin: 0,
            letterSpacing: '0.03em',
          }}
        >
          {card.challengeTitle} · {card.startDate.replaceAll('-', '.')} — {card.endDate.replaceAll('-', '.')}
        </p>

        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '14px 0 0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
          }}
        >
          {codes.map(c => {
            const entry = getAchievement(c)
            if (!entry) return null
            return (
              <li
                key={c}
                title={entry.hint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(245,240,232,0.08)',
                  border: '1px solid rgba(245,240,232,0.15)',
                  borderRadius: 999,
                  padding: '4px 9px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(251,246,237,0.94)',
                  letterSpacing: '-0.01em',
                }}
              >
                <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>{entry.icon}</span>
                {entry.label}
              </li>
            )
          })}
        </ul>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 6,
            marginTop: 14,
          }}
        >
          <MiniStat label="런지" value={card.stats.totalReps.toLocaleString()} />
          <MiniStat label="연속" value={`${card.stats.maxStreak}일`} />
          <MiniStat label="쉼" value={`${card.stats.restDays}일`} />
        </div>

        <FinisherStampLauncher
          name={card.memberName}
          generation={card.memberGeneration}
          challengeTitle={card.challengeTitle}
          startDate={card.startDate}
          endDate={card.endDate}
          achievements={card.achievements}
          stats={card.stats}
          stamps={card.stamps}
        />
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(245,240,232,0.06)',
        border: '1px solid rgba(245,240,232,0.10)',
        borderRadius: 12,
        padding: '10px 8px',
        textAlign: 'center',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          fontSize: 9,
          color: 'rgba(245,240,232,0.5)',
          margin: 0,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 14,
          fontWeight: 800,
          margin: '4px 0 0',
          color: '#FBF6ED',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </p>
    </div>
  )
}
