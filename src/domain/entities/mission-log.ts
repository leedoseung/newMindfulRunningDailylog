export type MissionLog = {
  id: string
  participationId: string
  logDate: string              // 'YYYY-MM-DD'
  count: number
  completed: boolean           // count >= 100 (DB generated)
  usedPass: boolean
  updatedAt: string            // ISO timestamptz
}
