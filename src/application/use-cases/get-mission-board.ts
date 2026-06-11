import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { computeMissionDayCell } from '@/domain/entities/mission-day-cell'

export type GetMissionBoardInput = {
  participation: ChallengeParticipation
  today: string  // 'YYYY-MM-DD' KST
}

export type MissionBoard = {
  cells: MissionDayCell[]
  streak: number
  completedDays: number
  passesRemaining: number
  todayIndex: number  // -1 if today outside range
  challengeId: string
}

function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export class GetMissionBoardUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: GetMissionBoardInput): Promise<MissionBoard> {
    const challenge = await this.challengeRepo.getById(input.participation.challengeId)
    if (!challenge) throw new Error('CHALLENGE_NOT_FOUND')

    const logs = await this.missionLogRepo.getByParticipation(input.participation.id)
    const logByDate = new Map(logs.map(l => [l.logDate, l]))

    const cells: MissionDayCell[] = []
    let todayIndex = -1
    for (let i = 0; i < challenge.durationDays; i++) {
      const cellDate = addDays(challenge.startDate, i)
      const cell = computeMissionDayCell({
        dayIndex: i,
        cellDate,
        today: input.today,
        log: logByDate.get(cellDate) ?? null,
      })
      cells.push(cell)
      if (cellDate === input.today) todayIndex = i
    }

    let streak = 0
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i]!
      if (c.state === 'future') continue
      const keep = c.state === 'done' || c.state === 'partial' || c.state === 'pass' || (c.state === 'today' && c.count > 0)
      if (keep) streak++
      else break
    }

    const completedDays = cells.filter(c =>
      c.state === 'done' || c.state === 'pass' || (c.state === 'today' && c.usedPass)
    ).length

    return {
      cells,
      streak,
      completedDays,
      passesRemaining: input.participation.passesRemaining,
      todayIndex,
      challengeId: challenge.id,
    }
  }
}
