export type MissionLog = {
  id: string
  participationId: string
  logDate: string              // 'YYYY-MM-DD'
  count: number
  completed: boolean           // count >= goalMin (DB generated)
  usedPass: boolean
  isRestDay?: boolean          // user-marked weekly rest
  note?: string | null         // short reflection (mindful check-in)
  updatedAt: string            // ISO timestamptz
}
