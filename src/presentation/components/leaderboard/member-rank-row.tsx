import type { MemberStats } from '@/domain/entities/member'
import { AvatarImage } from '../shared/avatar-image'

type Props = {
  stats: MemberStats
  rank: number
  statValue: string
  statUnit: string
  statSub: string
  onTodayRun: (memberId: string, memberName: string) => void
  onDiary: (memberId: string, memberName: string) => void
}

function getAvatarBg(rank: number): string {
  if (rank === 1) return '#111111'
  if (rank === 2) return '#555555'
  if (rank === 3) return '#777777'
  return '#999999'
}

export function MemberRankRow({ stats, rank, statValue, statUnit, statSub, onTodayRun, onDiary }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '14px 16px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        margin: '0 22px 8px',
        transition: 'transform 0.15s',
      }}
    >
      <span style={{
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.9rem', fontWeight: 500,
        color: '#888', minWidth: '20px', textAlign: 'center',
      }}>
        {rank}
      </span>
      <AvatarImage
        name={stats.name}
        avatarUrl={stats.avatarUrl}
        size={36}
        bg={getAvatarBg(rank)}
      />
      <div style={{ flex: 1 }}>
        <button
          type="button"
          style={{
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.83rem', fontWeight: 500,
            color: '#111111', background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, textAlign: 'left',
          }}
          onClick={() => onDiary(stats.id, stats.name)}
        >
          {stats.name}
        </button>
        <div style={{ fontSize: '0.62rem', color: '#888', marginTop: '1px' }}>
          {statSub}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1rem', fontWeight: 500, color: '#111111', lineHeight: 1 }}>
          {statValue}<span style={{ fontSize: '0.6rem', color: '#888' }}>{statUnit}</span>
        </div>
      </div>
      <button
        type="button"
        style={{
          fontSize: '0.65rem', fontWeight: 500,
          padding: '5px 10px', borderRadius: '20px',
          background: '#F7F7F5',
          color: '#555',
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
        onClick={() => onTodayRun(stats.id, stats.name)}
      >
        오늘의 러닝
      </button>
    </div>
  )
}
