export type RunLog = {
  id: string
  memberId: string
  memberName: string
  date: string // 'YYYY-MM-DD'
  durationMin: number
  title: string
  thoughtBefore: string
  thoughtDuring: string
  thoughtAfter: string
  location: string
  photoUrl: string // '' if no photo
  createdAt: string
}
