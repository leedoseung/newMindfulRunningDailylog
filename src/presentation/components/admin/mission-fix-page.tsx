'use client'
import { useState } from 'react'

type Member = { id: string; name: string; generation: string }
type Participation = {
  id: string; challengeId: string; challengeTitle: string
  startDate: string; durationDays: number
  passesRemaining: number; failedAt: string | null; completedAt: string | null
}
type Log = {
  id: string; participationId: string; logDate: string; count: number
  completed: boolean; usedPass: boolean; isRestDay: boolean
  note: string | null; updatedAt: string
}

export function MissionFixPage() {
  const [q, setQ] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [parts, setParts] = useState<Participation[]>([])
  const [selectedPart, setSelectedPart] = useState<Participation | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [editDate, setEditDate] = useState('')
  const [editCount, setEditCount] = useState<number>(0)
  const [status, setStatus] = useState<string>('')

  async function searchMembers() {
    if (q.trim() === '') { setStatus('회원 이름을 입력하세요'); return }
    setStatus('검색 중…')
    const res = await fetch(`/api/admin/members/search?q=${encodeURIComponent(q)}`)
    const body = await res.json()
    if (!res.ok) { setStatus(`에러: ${body.error}`); return }
    setMembers(body.members)
    setSelectedMember(null); setParts([]); setSelectedPart(null); setLogs([])
    setStatus('')
  }

  async function pickMember(m: Member) {
    setSelectedMember(m)
    const res = await fetch(`/api/admin/participations?memberId=${m.id}`)
    const body = await res.json()
    if (!res.ok) { setStatus(`에러: ${body.error}`); return }
    setParts(body.participations)
    setSelectedPart(null); setLogs([])
  }

  async function pickParticipation(p: Participation) {
    setSelectedPart(p)
    const res = await fetch(`/api/admin/mission-log?participationId=${p.id}`)
    const body = await res.json()
    if (!res.ok) { setStatus(`에러: ${body.error}`); return }
    setLogs(body.logs)
  }

  async function refreshLogs() {
    if (!selectedPart) return
    const res = await fetch(`/api/admin/mission-log?participationId=${selectedPart.id}`)
    const body = await res.json()
    if (res.ok) setLogs(body.logs)
  }

  async function refreshParticipation() {
    if (!selectedMember) return
    const res = await fetch(`/api/admin/participations?memberId=${selectedMember.id}`)
    const body = await res.json()
    if (res.ok) {
      setParts(body.participations)
      const updated = body.participations.find((p: Participation) => p.id === selectedPart?.id)
      if (updated) setSelectedPart(updated)
    }
  }

  async function postOp(payload: Record<string, unknown>) {
    setStatus('저장 중…')
    const res = await fetch('/api/admin/mission-log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok) { setStatus(`에러: ${body.error}`); return }
    setStatus('저장됨')
    await refreshLogs()
    await refreshParticipation()
  }

  async function applyCount() {
    if (!selectedPart || !editDate) return
    await postOp({ op: 'setCount', participationId: selectedPart.id, logDate: editDate, count: editCount })
  }

  async function toggleRest(date: string) {
    if (!selectedPart) return
    await postOp({ op: 'setRestDay', participationId: selectedPart.id, logDate: date })
  }

  async function toggleUsedPass(date: string, current: boolean) {
    if (!selectedPart) return
    await postOp({ op: 'setUsedPass', participationId: selectedPart.id, logDate: date, usedPass: !current })
  }

  async function adjustPasses(delta: 1 | -1) {
    if (!selectedPart) return
    await postOp({ op: 'adjustPasses', participationId: selectedPart.id, delta })
  }

  const inputCls =
    'rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900'
  const btnPrimary =
    'rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 active:bg-neutral-800'
  const btnSecondary =
    'rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100'
  const btnDanger =
    'rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100'
  const card = 'rounded-xl border border-neutral-200 bg-white p-5 shadow-sm'

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-neutral-900">
      <h1 className="text-2xl font-semibold tracking-tight">관리자 — 기록 정정</h1>
      <p className="mt-1 text-sm text-neutral-500">회원 검색 → 챌린지 참가 선택 → 일자별 기록 정정</p>

      <section className={`mt-6 ${card}`}>
        <label className="block text-xs font-medium text-neutral-500 mb-2">회원 검색</label>
        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            placeholder="회원 이름"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchMembers() }}
          />
          <button className={btnPrimary} onClick={searchMembers}>검색</button>
        </div>
        {members.length > 0 && (
          <ul className="mt-3 divide-y divide-neutral-100 border-t border-neutral-100">
            {members.map((m) => {
              const active = selectedMember?.id === m.id
              return (
                <li key={m.id}>
                  <button
                    onClick={() => pickMember(m)}
                    className={`w-full text-left py-2 px-1 text-sm flex justify-between items-center hover:bg-neutral-50 ${active ? 'bg-neutral-100 font-medium' : ''}`}
                  >
                    <span>{m.name}</span>
                    <span className="text-xs text-neutral-500">{m.generation}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {selectedMember && (
        <section className={`mt-4 ${card}`}>
          <h2 className="text-sm font-semibold mb-3">{selectedMember.name} · 참가 챌린지</h2>
          {parts.length === 0 ? (
            <p className="text-sm text-neutral-500">참가 기록 없음</p>
          ) : (
            <ul className="space-y-2">
              {parts.map((p) => {
                const active = selectedPart?.id === p.id
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => pickParticipation(p)}
                      className={`w-full text-left rounded-md border px-3 py-2 text-sm flex justify-between items-center hover:bg-neutral-50 ${active ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'}`}
                    >
                      <span>{p.challengeTitle}</span>
                      <span className="text-xs text-neutral-500">패스 {p.passesRemaining}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {selectedPart && (
        <section className={`mt-4 ${card}`}>
          <h2 className="text-sm font-semibold">{selectedPart.challengeTitle}</h2>

          <div className="mt-4 flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
            <div className="flex-1">
              <div className="text-xs text-neutral-500">패스 잔여</div>
              <div className="text-lg font-semibold">{selectedPart.passesRemaining}</div>
            </div>
            <button className={btnSecondary} onClick={() => adjustPasses(1)}>+1 환불</button>
            <button className={btnDanger} onClick={() => adjustPasses(-1)}>−1 차감</button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto_1fr] sm:items-end">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">날짜</label>
              <input
                type="date"
                className={inputCls}
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">횟수</label>
              <input
                type="number"
                min={0}
                className={`${inputCls} w-28`}
                value={editCount}
                onChange={(e) => setEditCount(Number(e.target.value))}
              />
            </div>
            <button className={`${btnPrimary} sm:justify-self-start`} onClick={applyCount}>저장</button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-medium text-neutral-500">
                  <th className="py-2 pr-3">날짜</th>
                  <th className="py-2 pr-3 text-right">count</th>
                  <th className="py-2 pr-3 text-center">완료</th>
                  <th className="py-2 pr-3 text-center">패스</th>
                  <th className="py-2 pr-3 text-center">휴식</th>
                  <th className="py-2 pr-0 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{l.logDate}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{l.count}</td>
                    <td className="py-2 pr-3 text-center">{l.completed ? '✓' : ''}</td>
                    <td className="py-2 pr-3 text-center">{l.usedPass ? '✓' : ''}</td>
                    <td className="py-2 pr-3 text-center">{l.isRestDay ? '✓' : ''}</td>
                    <td className="py-2 pr-0 text-right">
                      <div className="inline-flex gap-1">
                        <button className={btnSecondary} onClick={() => { setEditDate(l.logDate); setEditCount(l.count) }}>편집</button>
                        <button className={btnSecondary} onClick={() => toggleUsedPass(l.logDate, l.usedPass)}>패스</button>
                        <button className={btnSecondary} onClick={() => toggleRest(l.logDate)}>휴식</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {status && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs shadow-md ${
            status.startsWith('에러') ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'
          }`}
        >
          {status}
        </div>
      )}
    </main>
  )
}
