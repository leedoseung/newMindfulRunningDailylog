import { describe, it, expect, vi } from 'vitest'
import { GetActiveChallengeUseCase } from '@/application/use-cases/get-active-challenge'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
  completedAt: null, failedAt: null, revivedAt: null,
}

describe('GetActiveChallengeUseCase', () => {
  it('returns null challenge when none active', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(null), getById: vi.fn(), getUpcoming: vi.fn() } as IChallengeRepository
    const pRepo = { getByMember: vi.fn() } as unknown as IChallengeParticipationRepository
    const uc = new GetActiveChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute('m1')
    expect(result).toEqual({ challenge: null, participation: null })
  })

  it('returns challenge + participation when both exist', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as IChallengeRepository
    const pRepo = { getByMember: vi.fn().mockResolvedValue(participation) } as unknown as IChallengeParticipationRepository
    const uc = new GetActiveChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute('m1')
    expect(result).toEqual({ challenge, participation })
    expect(pRepo.getByMember).toHaveBeenCalledWith('c1', 'm1')
  })

  it('returns challenge + null participation when not enrolled', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as IChallengeRepository
    const pRepo = { getByMember: vi.fn().mockResolvedValue(null) } as unknown as IChallengeParticipationRepository
    const uc = new GetActiveChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute('m1')
    expect(result).toEqual({ challenge, participation: null })
  })
})
