export type Member = {
  id: string
  name: string
  groupName: string
  generation: string
  instaId: string
  avatarUrl: string
}

export type MemberStats = Member & {
  totalCount: number
  totalMinutes: number
  monthlyCount: number
  monthlyMinutes: number
}
