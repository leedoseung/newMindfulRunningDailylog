import { getAchievement, ACHIEVEMENT_ORDER, type AchievementCode } from '@/domain/badges/achievement-catalog'
import type {
  WrapFinisher,
  WrapJourneyer,
  WrapMessage,
  WrapSeasonStats,
} from '@/application/use-cases/get-challenge-wrap'
import { FinisherStampLauncher } from './finisher-stamp-launcher'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const RANK = new Map(ACHIEVEMENT_ORDER.map((c, i) => [c as string, i]))

function sortCodes(codes: AchievementCode[]): AchievementCode[] {
  return [...codes].sort((a, b) => (RANK.get(a) ?? 99) - (RANK.get(b) ?? 99))
}

function Avatar({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  const initial = name.slice(0, 1)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: url ? `url(${url}) center / cover` : '#EBEBEB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
      aria-label={name}
    >
      {url ? null : initial}
    </div>
  )
}

function Hero({ stats }: { challengeTitle: string; stats: WrapSeasonStats }) {
  return (
    <section
      style={{
        fontFamily: FONT,
        color: '#231B17',
        borderRadius: 28,
        padding: '36px 28px 32px',
        background: '#F5EEE1',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        boxShadow: '0 2px 0 rgba(35,27,23,0.04)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -70,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(232,160,191,0.32) 0%, rgba(232,160,191,0) 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -90,
          left: -70,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(212,161,23,0.16) 0%, rgba(212,161,23,0) 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 22,
              height: 2,
              background: '#B8231F',
              borderRadius: 2,
            }}
          />
          <p
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: '#B8231F',
              margin: 0,
              fontWeight: 700,
            }}
          >
            SEASON 01 · LUNGE 100
          </p>
        </div>

        <h1
          style={{
            fontSize: '2.6rem',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            lineHeight: 1.02,
            margin: '0 0 6px',
            color: '#231B17',
          }}
        >
          여름의 100일
        </h1>

        <p
          style={{
            fontSize: '0.72rem',
            color: '#8B7A6E',
            margin: 0,
            letterSpacing: '0.06em',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
          }}
        >
          2026.06.15 &nbsp;—&nbsp; 2026.09.22
        </p>

        <p
          style={{
            fontSize: '0.98rem',
            lineHeight: 1.75,
            color: '#3B2E27',
            margin: '30px 0 0',
            letterSpacing: '-0.015em',
            maxWidth: 460,
          }}
        >
          <strong style={{ fontWeight: 800 }}>{stats.totalParticipants}명</strong>의 마풀런 러너가 함께 문을 열었고,{' '}
          <br />
          그중{' '}
          <strong style={{ fontWeight: 800 }}>{stats.totalFinishers}명</strong>이 100일 마지막 도장까지 걸어왔어요.
        </p>

        <div
          style={{
            margin: '28px 0 0',
            padding: '20px 22px',
            background: 'rgba(184,35,31,0.06)',
            border: '1px solid rgba(184,35,31,0.14)',
            borderRadius: 18,
            position: 'relative',
          }}
        >
          <p
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              color: '#B8231F',
              margin: 0,
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            우리가 지나온 런지
          </p>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '2.4rem',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: '#B8231F',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stats.totalReps.toLocaleString()}
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                marginLeft: 4,
                letterSpacing: '-0.02em',
              }}
            >
              회
            </span>
          </p>
        </div>

        <div
          aria-hidden
          style={{
            height: 1,
            background:
              'linear-gradient(90deg, rgba(35,27,23,0.12), rgba(35,27,23,0))',
            margin: '30px 0 22px',
          }}
        />

        <p
          style={{
            fontSize: '1rem',
            lineHeight: 1.7,
            color: '#231B17',
            margin: 0,
            letterSpacing: '-0.015em',
            fontWeight: 600,
          }}
        >
          매일 런지로 고생하신 여러분,{' '}
          <br />
          엉덩이에{' '}
          <span
            style={{
              background: 'linear-gradient(180deg, transparent 62%, #FBD5C4 62%)',
              padding: '0 2px',
            }}
          >
            꽃 피셨나요?
          </span>{' '}
          🌸
        </p>

        <p
          style={{
            fontSize: '0.9rem',
            lineHeight: 1.75,
            color: '#6B554A',
            margin: '16px 0 0',
            letterSpacing: '-0.01em',
          }}
        >
          여름 내내 자리를 지켜준 다리와 마음에 박수를.
          <br />
          이제 그 튼튼한 다리로, 다음 탐험을 떠나요.
        </p>

        <p
          style={{
            fontSize: '0.66rem',
            color: '#B8A79A',
            margin: '26px 0 0',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          — 매일 마인드풀 러닝
        </p>
      </div>
    </section>
  )
}

function SeasonStatsGrid({ stats }: { stats: WrapSeasonStats }) {
  return (
    <section style={{ fontFamily: FONT }}>
      <SectionTitle eyebrow="OUR NUMBERS" title="숫자로 본 여름" />
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '10px 0 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        <StatCell label="함께한 사람" value={`${stats.totalParticipants}`} unit="명" />
        <StatCell label="완주" value={`${stats.totalFinishers}`} unit="명" />
        <StatCell label="쌓인 도장" value={stats.totalStamps.toLocaleString()} unit="개" />
        <StatCell label="쉬어간 날" value={stats.totalRestDays.toLocaleString()} unit="일" />
      </ul>
      {stats.longestStreakName && (
        <p
          style={{
            fontSize: 12,
            color: '#666',
            margin: '14px 2px 0',
            letterSpacing: '-0.01em',
            lineHeight: 1.6,
          }}
        >
          🔥 최장 연속 <strong style={{ color: '#111' }}>{stats.longestStreak}일</strong>
          {' · '}
          <span style={{ color: '#111' }}>{stats.longestStreakName}</span>
        </p>
      )}
    </section>
  )
}

function StatCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <li
      style={{
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 16,
        padding: '16px 16px 14px',
      }}
    >
      <p style={{ fontSize: 11, color: '#999', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          letterSpacing: '-0.03em',
          color: '#111',
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>{unit}</span>
      </p>
    </li>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header style={{ marginBottom: 14, fontFamily: FONT }}>
      <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.22em', margin: 0, textTransform: 'uppercase' }}>
        {eyebrow}
      </p>
      <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 0', color: '#111' }}>
        {title}
      </h2>
    </header>
  )
}

function FinisherCard({
  finisher,
  challengeTitle,
  startDate,
  endDate,
}: {
  finisher: WrapFinisher
  challengeTitle: string
  startDate: string
  endDate: string
}) {
  const codes = sortCodes(finisher.achievements)
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 20,
        padding: 18,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
      }}
    >
      <Avatar url={finisher.avatarUrl} name={finisher.name} size={52} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#111' }}>
            {finisher.name}
          </p>
          <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
            {finisher.generation}
          </p>
        </div>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '10px 0 0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
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
                  gap: 5,
                  background: '#FFF6F5',
                  border: '1px solid #FFE9E7',
                  borderRadius: 999,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#7c2d12',
                  letterSpacing: '-0.02em',
                }}
              >
                <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>{entry.icon}</span>
                {entry.label}
              </li>
            )
          })}
        </ul>
        <p style={{ fontSize: 11, color: '#666', margin: '10px 0 0', letterSpacing: '-0.01em' }}>
          누적 {finisher.stats.totalReps.toLocaleString()}회 · 최장 연속 {finisher.stats.maxStreak}일
          {finisher.stats.restDays > 0 && ` · 쉼 ${finisher.stats.restDays}일`}
        </p>
        <FinisherStampLauncher
          name={finisher.name}
          generation={finisher.generation}
          challengeTitle={challengeTitle}
          startDate={startDate}
          endDate={endDate}
          achievements={finisher.achievements}
          stats={finisher.stats}
          stamps={finisher.stamps}
        />
      </div>
    </article>
  )
}

function JourneyerGrid({ journeyers }: { journeyers: WrapJourneyer[] }) {
  if (journeyers.length === 0) return null
  return (
    <section style={{ fontFamily: FONT, padding: '4px 0 0' }}>
      <SectionTitle eyebrow="함께 걸었어요" title={`시즌을 함께한 ${journeyers.length}분`} />
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 14px', lineHeight: 1.6 }}>
        완주는 아니지만, 한 걸음이라도 함께 시작해 준 분들이에요. 다음 시즌엔 마주 걸어요.
      </p>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))',
          gap: 12,
        }}
      >
        {journeyers.map(j => (
          <li key={j.memberId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Avatar url={j.avatarUrl} name={j.name} size={52} />
            <p style={{ fontSize: 11, color: '#888', margin: 0, textAlign: 'center', letterSpacing: '-0.02em' }}>
              {j.name}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function MessageCard({ message }: { message: WrapMessage }) {
  return (
    <li
      style={{
        background: '#FAFAF8',
        border: '1px solid #EEE7E4',
        borderRadius: 18,
        padding: 18,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <Avatar url={message.memberAvatarUrl} name={message.memberName} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#111' }}>
            {message.memberName}
          </p>
          <p style={{ fontSize: 11, color: '#999', margin: 0 }}>
            {message.logDate.slice(5).replace('-', '.')}
            {' · '}
            {message.isRestDay ? '쉼' : `${message.count}회`}
          </p>
        </div>
        <p
          style={{
            fontSize: 14,
            fontStyle: 'italic',
            color: '#3B2A24',
            margin: '8px 0 0',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            letterSpacing: '-0.01em',
          }}
        >
          {`‟${message.note}”`}
        </p>
      </div>
    </li>
  )
}

function MessageWall({ messages }: { messages: WrapMessage[] }) {
  if (messages.length === 0) return null
  return (
    <section style={{ fontFamily: FONT, padding: '4px 0 0' }}>
      <SectionTitle eyebrow="OUR VOICES" title="시즌에 남긴 한 줄들" />
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 14px', lineHeight: 1.6 }}>
        걸으며 남겼던 마음의 결. 우리의 여정에 이런 문장들이 흘렀어요.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(m => <MessageCard key={m.logId} message={m} />)}
      </ul>
    </section>
  )
}

export type LungeS1WrapProps = {
  challengeTitle: string
  startDate: string
  endDate: string
  finishers: WrapFinisher[]
  journeyers: WrapJourneyer[]
  messages: WrapMessage[]
  seasonStats: WrapSeasonStats
}

export function LungeS1Wrap({ challengeTitle, startDate, endDate, finishers, journeyers, messages, seasonStats }: LungeS1WrapProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Hero challengeTitle={challengeTitle} stats={seasonStats} />
      <SeasonStatsGrid stats={seasonStats} />

      <section style={{ fontFamily: FONT }}>
        <SectionTitle eyebrow="FINISHERS" title={`끝까지 함께한 ${finishers.length}분`} />
        <p style={{ fontSize: 12, color: '#666', margin: '0 0 14px', lineHeight: 1.6 }}>
          100일을 지나온 사람들. 각자의 방식으로 도착했어요.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {finishers.map(f => (
            <li key={f.memberId}>
              <FinisherCard
                finisher={f}
                challengeTitle={challengeTitle}
                startDate={startDate}
                endDate={endDate}
              />
            </li>
          ))}
        </ul>
      </section>

      <JourneyerGrid journeyers={journeyers} />
      <MessageWall messages={messages} />

      <footer
        style={{
          fontFamily: FONT,
          textAlign: 'center',
          padding: '18px 12px 8px',
          color: '#888',
          fontSize: 12,
          letterSpacing: '-0.01em',
        }}
      >
        고생하셨어요. 다음 시즌에서 다시 만나요. 🌱
      </footer>
    </div>
  )
}
