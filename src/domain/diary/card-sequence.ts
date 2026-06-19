import type { WrappedStats } from './wrapped-stats'

export type CardKey =
  | 'intro'
  | 'total'
  | 'heatmap'
  | 'streak'
  | 'weekday'
  | 'longest'
  | 'voice'
  | 'album'
  | 'title'
  | 'share'
  | 'rest'

export function buildCardSequence(stats: WrappedStats): CardKey[] {
  if (stats.totalRuns === 0) return ['intro', 'rest', 'share']
  const seq: CardKey[] = ['intro', 'total', 'heatmap']
  if (stats.totalRuns >= 3) seq.push('streak')
  if (stats.topWeekday && stats.totalRuns >= 3) seq.push('weekday')
  if (stats.longestRun) seq.push('longest')
  if (stats.voicePool.length > 0) seq.push('voice')
  if (stats.albumPhotos.length > 0) seq.push('album')
  seq.push('title')
  seq.push('share')
  return seq
}
