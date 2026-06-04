export type RunLog = {
  id: string
  memberId: string
  memberName: string
  memberAvatarUrl: string
  memberInstaId: string  // '' if not set
  date: string    // 'YYYY-MM-DD'
  runTime: string | null // 'HH:MM' or null
  durationMin: number
  title: string
  thoughtBefore: string
  thoughtDuring: string
  thoughtAfter: string
  location: string
  photoUrl: string // '' if no photo
  createdAt: string
  likeCount: number
  commentCount: number
}
