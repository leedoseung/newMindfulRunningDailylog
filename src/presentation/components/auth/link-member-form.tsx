'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Member } from '@/domain/entities/member'

type Props = {
  members: Member[]
}

export function LinkMemberForm({ members }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) { setError('이름을 선택해주세요'); return }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/link-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? '연결 실패')
      }
      router.push('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '연결 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.6rem', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>
            Mindful Running
          </div>
          <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1.4rem', fontWeight: 500, color: '#111111' }}>
            반갑습니다 👋
          </div>
          <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '8px' }}>
            어떤 멤버세요? 이름을 선택해주세요
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(m.id)}
                style={{
                  padding: '16px 18px', borderRadius: '16px', border: 'none',
                  background: selectedId === m.id ? '#111111' : '#fff',
                  color: selectedId === m.id ? '#fff' : '#111111',
                  fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.92rem', fontWeight: 500,
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s',
                }}
              >
                {m.name}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedId}
            style={{
              width: '100%', padding: '16px', border: 'none', borderRadius: '16px',
              background: !selectedId || submitting ? '#ccc' : '#111111',
              color: '#fff', fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.9rem', fontWeight: 500,
              cursor: !selectedId || submitting ? 'not-allowed' : 'pointer',
              boxShadow: selectedId ? '0 6px 20px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? '연결 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </main>
  )
}
