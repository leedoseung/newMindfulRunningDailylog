import type { MemberStats } from '@/domain/entities/member'

type Props = {
  stats: MemberStats
  rank: number
  onTodayRun: (memberId: string, memberName: string) => void
  onDiary: (memberId: string, memberName: string) => void
}

export function MemberRankRow({ stats, rank, onTodayRun, onDiary }: Props) {
  const rankStyle =
    rank === 1
      ? 'text-yellow-400'
      : rank === 2
      ? 'text-gray-300'
      : rank === 3
      ? 'text-amber-600'
      : 'text-white/30'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
      <span className={`w-6 text-center font-display font-bold text-sm ${rankStyle}`}>
        {rank}
      </span>
      <button
        type="button"
        className="flex-1 text-left text-sm text-white font-medium hover:text-accent transition-colors"
        onClick={() => onDiary(stats.id, stats.name)}
      >
        {stats.name}
      </button>
      <div className="text-right mr-3">
        <div className="text-lg font-bold font-display text-white leading-none">
          {stats.totalCount}
        </div>
        <div className="text-xs text-white/30">총 {stats.totalMinutes}분</div>
      </div>
      <button
        type="button"
        className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        onClick={() => onTodayRun(stats.id, stats.name)}
      >
        오늘의 러닝
      </button>
    </div>
  )
}
