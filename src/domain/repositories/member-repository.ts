import type { Member, MemberStats } from '@/domain/entities/member'

export interface IMemberRepository {
  getAll(): Promise<Member[]>
  getLeaderboard(): Promise<MemberStats[]>
  getById(memberId: string): Promise<Member | null>
}
