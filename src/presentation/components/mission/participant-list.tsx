import type { ChallengeParticipantView } from '@/application/use-cases/get-challenge-participants'
import { AvatarImage } from '../shared/avatar-image'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  participants: ChallengeParticipantView[]
  currentMemberId?: string
}

export function ParticipantList({ participants, currentMemberId }: Props) {
  const count = participants.length

  return (
    <section
      aria-label="챌린지 참가자"
      style={{
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: 20,
        fontFamily: FONT,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
          함께 도전하는 사람들
        </h3>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#b8231f' }}>
          {count}명
        </span>
      </header>

      {count === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: '#999', padding: '12px 0', textAlign: 'center' }}>
          아직 참가자가 없어요. 첫 번째가 되어보세요 🥇
        </p>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
            gap: 12,
          }}
        >
          {participants.map((p) => {
            const isMe = currentMemberId && p.memberId === currentMemberId
            return (
              <li
                key={p.memberId}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    padding: isMe ? 2 : 0,
                    borderRadius: '50%',
                    background: isMe ? 'linear-gradient(135deg, #b8231f 0%, #d4a017 100%)' : 'transparent',
                  }}
                >
                  <AvatarImage
                    name={p.name}
                    avatarUrl={p.avatarUrl ?? ''}
                    size={48}
                    bg="#EBEBEB"
                    color="#888"
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isMe ? 700 : 500,
                    color: isMe ? '#b8231f' : '#444',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={p.name}
                >
                  {p.name}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
