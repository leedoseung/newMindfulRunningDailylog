import { getAchievement, ACHIEVEMENT_ORDER, type AchievementCode } from '@/domain/badges/achievement-catalog'
import type {
  WrapFinisher,
  WrapJourneyer,
  WrapMessage,
  WrapSeasonStats,
} from '@/application/use-cases/get-challenge-wrap'

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

function Hero({ challengeTitle, stats }: { challengeTitle: string; stats: WrapSeasonStats }) {
  return (
    <section
      style={{
        fontFamily: FONT,
        color: '#fff',
        borderRadius: 24,
        padding: '32px 24px 28px',
        background:
          'radial-gradient(120% 140% at 100% 0%, rgba(244,114,182,0.35) 0%, rgba(167,139,250,0.15) 40%, transparent 65%),' +
          'radial-gradient(80% 100% at 0% 100%, rgba(56,189,248,0.25) 0%, transparent 60%),' +
          'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4C1D95 100%)',
        boxShadow: '0 12px 32px rgba(30,27,75,0.28)',
        isolation: 'isolate',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <p
        style={{
          fontSize: '0.6rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.68)',
          margin: 0,
        }}
      >
        SEASON WRAP · 2026
      </p>
      <h1
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: '10px 0 6px',
        }}
      >
        {challengeTitle} <br />
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          우리의 100일이 여기 담겨 있어요.
        </span>
      </h1>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '22px 0 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        <StatCell label="함께한 사람" value={`${stats.totalParticipants}명`} />
        <StatCell label="완주" value={`${stats.totalFinishers}명`} />
        <StatCell label="쌓인 도장" value={`${stats.totalStamps.toLocaleString()}개`} />
        <StatCell label="누적 런지" value={`${stats.totalReps.toLocaleString()}회`} />
      </ul>

      {stats.longestStreakName && (
        <p
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.72)',
            margin: '18px 0 0',
            letterSpacing: '-0.01em',
          }}
        >
          🔥 최장 연속 <strong style={{ color: '#fff' }}>{stats.longestStreak}일</strong> · {stats.longestStreakName}
        </p>
      )}
    </section>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <li
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '12px 14px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)', margin: 0, letterSpacing: '0.04em' }}>{label}</p>
      <p
        style={{
          fontSize: 20,
          fontWeight: 800,
          margin: '4px 0 0',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
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

function FinisherCard({ finisher }: { finisher: WrapFinisher }) {
  const codes = sortCodes(finisher.achievements)
  const isMulti = finisher.generation.includes(',')
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
            {finisher.generation}{isMulti && ' · 다기 완주'}
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
  finishers: WrapFinisher[]
  journeyers: WrapJourneyer[]
  messages: WrapMessage[]
  seasonStats: WrapSeasonStats
}

export function LungeS1Wrap({ challengeTitle, finishers, journeyers, messages, seasonStats }: LungeS1WrapProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Hero challengeTitle={challengeTitle} stats={seasonStats} />

      <section style={{ fontFamily: FONT }}>
        <SectionTitle eyebrow="FINISHERS" title={`끝까지 함께한 ${finishers.length}분`} />
        <p style={{ fontSize: 12, color: '#666', margin: '0 0 14px', lineHeight: 1.6 }}>
          100일을 지나온 사람들. 각자의 방식으로 도착했어요.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {finishers.map(f => (
            <li key={f.memberId}>
              <FinisherCard finisher={f} />
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
