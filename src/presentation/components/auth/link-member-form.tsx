'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/infrastructure/supabase/browser-client'
import type { Member } from '@/domain/entities/member'

type Props = {
  members: Member[]
}

export function LinkMemberForm({ members }: Props) {
  const [selectedId, setSelectedId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [query, setQuery]           = useState('')

  const filtered = query.trim()
    ? members.filter(m => m.name.includes(query.trim()))
    : members

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
      // 브라우저 세션에 member_id를 직접 기록 (서버 쿠키 갱신 대신 클라이언트에서 처리)
      const { error: updateErr } = await createBrowserClient().auth.updateUser({
        data: { member_id: selectedId },
      })
      if (updateErr) throw new Error(updateErr.message)
      window.location.href = '/'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '연결 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 40px' }}>
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
          {/* 검색 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: '#fff', borderRadius: '14px', padding: '12px 16px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '12px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="이름 검색"
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
                fontSize: '0.9rem', color: '#111',
              }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#bbb', fontSize: '1rem', lineHeight: 1 }}>
                ×
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.82rem', padding: '20px 0' }}>
                검색 결과가 없습니다
              </div>
            )}
            {filtered.map(m => (
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
