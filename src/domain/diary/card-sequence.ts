import type { WrappedStats } from './wrapped-stats'

export type CardKey = 'intro' | 'total' | 'streak' | 'longest' | 'voice' | 'album' | 'share' | 'rest'

export function buildCardSequence(stats: WrappedStats): CardKey[] {
  if (stats.totalRuns === 0) return ['intro', 'rest', 'share']
  const seq: CardKey[] = ['intro', 'total']
  if (stats.totalRuns >= 3) seq.push('streak')
  if (stats.longestRun) seq.push('longest')
  if (stats.voicePool.length > 0) seq.push('voice')
  if (stats.albumPhotos.length > 0) seq.push('album')
  seq.push('share')
  return seq
}
