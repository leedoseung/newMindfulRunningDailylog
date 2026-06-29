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

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>관리자 — 기록 정정</h1>

      <section style={{ marginTop: 16 }}>
        <input placeholder="회원 이름" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={searchMembers}>검색</button>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              <button onClick={() => pickMember(m)}><span>{m.name}</span> ({m.generation})</button>
            </li>
          ))}
        </ul>
      </section>

      {selectedMember && (
        <section style={{ marginTop: 16 }}>
          <h2>{selectedMember.name} 참가</h2>
          <ul>
            {parts.map((p) => (
              <li key={p.id}>
                <button onClick={() => pickParticipation(p)}>
                  <span>{p.challengeTitle}</span> (패스 {p.passesRemaining})
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedPart && (
        <section style={{ marginTop: 16 }}>
          <h2>{selectedPart.challengeTitle}</h2>
          <div>패스 잔여: {selectedPart.passesRemaining}
            <button onClick={() => adjustPasses(1)}>+1 환불</button>
            <button onClick={() => adjustPasses(-1)}>-1 차감</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            <input type="number" min={0} value={editCount} onChange={(e) => setEditCount(Number(e.target.value))} />
            <button onClick={applyCount}>count 저장</button>
          </div>

          <table style={{ marginTop: 12, width: '100%' }}>
            <thead><tr><th>날짜</th><th>count</th><th>완료</th><th>패스사용</th><th>휴식</th><th>액션</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.logDate}</td>
                  <td>{l.count}</td>
                  <td>{l.completed ? '✓' : ''}</td>
                  <td>{l.usedPass ? '✓' : ''}</td>
                  <td>{l.isRestDay ? '✓' : ''}</td>
                  <td>
                    <button onClick={() => toggleUsedPass(l.logDate, l.usedPass)}>패스토글</button>
                    <button onClick={() => toggleRest(l.logDate)}>휴식설정</button>
                    <button onClick={() => { setEditDate(l.logDate); setEditCount(l.count) }}>편집</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p>{status}</p>
    </main>
  )
}
