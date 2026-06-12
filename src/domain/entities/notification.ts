export type NotificationType = 'like' | 'comment' | 'challenge_announcement'

export type ChallengeAnnouncementPayload = {
  challenge_id: string
  title: string
  start_date: string
  url: string
}

export type Notification = {
  id: string
  type: NotificationType
  actorName: string | null
  actorAvatarUrl: string | null
  runLogId: string | null
  runTitle: string | null
  commentBody: string | null
  payload: ChallengeAnnouncementPayload | null
  isRead: boolean
  createdAt: string
}
