export type Notification = {
  id: string
  type: 'like' | 'comment'
  actorName: string
  actorAvatarUrl: string | null
  runLogId: string
  runTitle: string | null
  commentBody: string | null
  isRead: boolean
  createdAt: string
}
