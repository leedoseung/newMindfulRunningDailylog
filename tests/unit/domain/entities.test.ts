import type { RunLog } from '@/domain/entities/run-log'
import type { Member, MemberStats } from '@/domain/entities/member'

describe('RunLog entity', () => {
  it('has required fields', () => {
    const log: RunLog = {
      id: 'uuid-1',
      memberId: 'uuid-2',
      memberName: '이두승',
      date: '2026-05-24',
      durationMin: 45,
      title: '남산 달리기',
      thoughtBefore: '오늘은 가볍게',
      thoughtDuring: '생각보다 힘들다',
      thoughtAfter: '뿌듯하다',
      location: '남산',
      photoUrl: '',
      createdAt: '2026-05-24T09:00:00Z',
    }
    expect(log.durationMin).toBe(45)
  })
})

describe('MemberStats entity', () => {
  it('combines Member fields with stats', () => {
    const stats: MemberStats = {
      id: 'uuid-1',
      name: '이두승',
      groupName: 'A조',
      generation: '1기',
      instaId: 'doseu',
      totalCount: 100,
      totalMinutes: 4500,
      monthlyCount: 10,
      monthlyMinutes: 450,
    }
    expect(stats.totalCount).toBe(100)
  })
})
