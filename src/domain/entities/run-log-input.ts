export type RunLogInput = {
  memberId: string
  date: string    // 'YYYY-MM-DD'
  runTime: string | null // 'HH:MM' or null
  durationMin: number
  title: string
  thoughtBefore: string
  thoughtDuring: string
  thoughtAfter: string
  location: string
  photoUrl: string // '' if no photo
}
