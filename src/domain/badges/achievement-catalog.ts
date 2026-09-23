export const ACHIEVEMENTS = {
  FINISHER: { code: 'finisher', label: '100일 완주자', icon: '🌱', hint: '시즌을 함께 끝까지 걸었어요' },
  PERFECT_100: { code: 'perfect_100', label: 'Perfect 100', icon: '💯', hint: '100일 하루도 놓치지 않았어요' },
  STREAK_90: { code: 'streak_90', label: '90일 연속', icon: '🔥', hint: '90일 이상 이어진 흐름' },
  STREAK_60: { code: 'streak_60', label: '60일 연속', icon: '🔥', hint: '60일 이상 이어진 흐름' },
  STREAK_30: { code: 'streak_30', label: '30일 연속', icon: '🔥', hint: '30일 이상 이어진 흐름' },
  NO_PASS: { code: 'no_pass', label: '패스 없이', icon: '✨', hint: '패스 카드를 한 장도 쓰지 않았어요' },
  REVIVED: { code: 'revived', label: '돌아온 힘', icon: '💪', hint: '멈춤 뒤에 다시 돌아와 완주했어요' },
  ALL_100_REPS: { code: 'all_100_reps', label: '정직한 100회', icon: '🎯', hint: '도장을 찍은 모든 날이 100회 이상' },
} as const

export type AchievementKey = keyof typeof ACHIEVEMENTS
export type AchievementCode = (typeof ACHIEVEMENTS)[AchievementKey]['code']
export type AchievementEntry = (typeof ACHIEVEMENTS)[AchievementKey]

const CODE_TO_ENTRY: Record<string, AchievementEntry> = Object.fromEntries(
  Object.values(ACHIEVEMENTS).map(a => [a.code, a]),
)

export function getAchievement(code: string): AchievementEntry | null {
  return CODE_TO_ENTRY[code] ?? null
}

export const ACHIEVEMENT_ORDER: AchievementCode[] = [
  'finisher',
  'perfect_100',
  'no_pass',
  'streak_90',
  'streak_60',
  'streak_30',
  'all_100_reps',
  'revived',
]
