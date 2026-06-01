'use client'

import { useState, useEffect, useCallback } from 'react'
import { AvatarImage } from '../shared/avatar-image'
import type { RunLog } from '@/domain/entities/run-log'
import type { DonationRecord } from '@/domain/entities/donation'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const BANK_CODE = process.env.NEXT_PUBLIC_DONATION_BANK_CODE ?? ''
const ACCOUNT_NO = process.env.NEXT_PUBLIC_DONATION_ACCOUNT_NO ?? ''
const ACCOUNT_HOLDER = process.env.NEXT_PUBLIC_DONATION_ACCOUNT_HOLDER ?? ''

const BANK_NAMES: Record<string, string> = {
  '004': 'KB국민은행', '020': '우리은행', '088': '신한은행',
  '081': '하나은행', '003': 'IBK기업은행', '071': '우체국',
  '089': '케이뱅크', '090': '카카오뱅크', '092': '토스뱅크',
}

function prevMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y!, m! - 1, 1)
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}년 ${Number(m)}월`
}

type Props = {
  allRuns: RunLog[]
  memberId?: string
  memberName?: string
  memberAvatarUrl?: string
}

export function DonationCard({ allRuns, memberId, memberName = '', memberAvatarUrl = '' }: Props) {
  const maxMonth = prevMonth()
  const minMonth = addMonths(maxMonth, -23)

  const [selectedMonth, setSelectedMonth] = useState(maxMonth)
  const [donors, setDonors] = useState<DonationRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const monthDurationMin = allRuns
    .filter(r => r.date.startsWith(selectedMonth))
    .reduce((sum, r) => sum + r.durationMin, 0)
  const donationAmount = monthDurationMin * 1000
  const alreadyDonated = Boolean(memberId && donors.some(d => d.memberId === memberId))

  const loadDonors = useCallback(async (month: string) => {
    try {
      const res = await fetch(`/api/donations?month=${month}`)
      if (!res.ok) return
      const data = await res.json() as { donations: DonationRecord[] }
      setDonors(data.donations)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadDonors(selectedMonth) }, [selectedMonth, loadDonors])

  function handlePrevMonth() {
    const prev = addMonths(selectedMonth, -1)
    if (prev >= minMonth) setSelectedMonth(prev)
  }
  function handleNextMonth() {
    const next = addMonths(selectedMonth, +1)
    if (next <= maxMonth) setSelectedMonth(next)
  }

  function handleToss() {
    window.location.href = `supertoss://send?amount=${donationAmount}&bank=${BANK_CODE}&accountNo=${ACCOUNT_NO}`
  }

  async function handleCopy() {
    const text = `${BANK_NAMES[BANK_CODE] ?? BANK_CODE} ${ACCOUNT_NO} ${ACCOUNT_HOLDER}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDonate() {
    if (!memberId || submitting || alreadyDonated || monthDurationMin === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth: selectedMonth, durationMin: monthDurationMin, amount: donationAmount }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        alert(err.error ?? '기부 기록 실패')
        return
      }
      await loadDonors(selectedMonth)
    } catch {
      alert('네트워크 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const canGoPrev = addMonths(selectedMonth, -1) >= minMonth
  const canGoNext = selectedMonth < maxMonth

  // suppress unused variable warnings for env-based values only used in handlers
  void memberName
  void memberAvatarUrl

  return (
    <div style={{ margin: '0 22px 32px', background: '#fff', borderRadius: 20, padding: '20px 20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 600, color: '#888', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 16 }}>
        🫀 달리기 기부 마일리지
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button type="button" aria-label="←" onClick={handlePrevMonth} disabled={!canGoPrev}
          style={{ background: 'none', border: 'none', cursor: canGoPrev ? 'pointer' : 'default', padding: '4px 8px', color: canGoPrev ? '#111' : '#ccc', fontSize: '1rem' }}>←</button>
        <span style={{ fontFamily: FONT, fontSize: '1rem', fontWeight: 600, color: '#111' }}>{formatYearMonth(selectedMonth)}</span>
        <button type="button" aria-label="→" onClick={handleNextMonth} disabled={!canGoNext}
          style={{ background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'default', padding: '4px 8px', color: canGoNext ? '#111' : '#ccc', fontSize: '1rem' }}>→</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, background: '#F7F7F5', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontFamily: FONT, fontSize: '0.58rem', color: '#aaa', marginBottom: 4 }}>달린 시간</div>
          <div style={{ fontFamily: FONT, fontSize: '1.1rem', fontWeight: 600, color: '#111' }}>
            {monthDurationMin}<span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#999', marginLeft: 2 }}>분</span>
          </div>
        </div>
        <div style={{ flex: 1, background: '#F7F7F5', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontFamily: FONT, fontSize: '0.58rem', color: '#aaa', marginBottom: 4 }}>기부 금액</div>
          <div style={{ fontFamily: FONT, fontSize: '1.1rem', fontWeight: 600, color: '#111' }}>
            {donationAmount.toLocaleString()}<span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#999', marginLeft: 2 }}>원</span>
          </div>
        </div>
      </div>

      {monthDurationMin === 0 ? (
        <div style={{ padding: '12px 0', textAlign: 'center', fontSize: '0.78rem', color: '#bbb', fontFamily: FONT }}>
          이 달은 달린 기록이 없어요
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={handleToss} style={{
              flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#1E5EFF', color: '#fff', fontFamily: FONT, fontSize: '0.8rem', fontWeight: 600,
            }}>토스로 이체</button>
            <button type="button" onClick={handleCopy} style={{
              flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid #E5E5E5', background: '#fff',
              cursor: 'pointer', fontFamily: FONT, fontSize: '0.8rem', fontWeight: 500, color: '#444',
            }}>{copied ? '복사됨 ✓' : '계좌 복사'}</button>
          </div>
          {memberId && (
            <button type="button" onClick={handleDonate} disabled={submitting || alreadyDonated}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                cursor: alreadyDonated ? 'default' : 'pointer',
                background: alreadyDonated ? '#F0F0F0' : '#111',
                color: alreadyDonated ? '#aaa' : '#fff',
                fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600, marginBottom: 16,
              }}>
              {submitting ? '기록 중...' : alreadyDonated ? '이미 기부하셨어요 ✓' : '기부했어요'}
            </button>
          )}
        </>
      )}

      {donors.length > 0 && (
        <div>
          <div style={{ fontFamily: FONT, fontSize: '0.58rem', color: '#bbb', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            {formatYearMonth(selectedMonth)} 기부자
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {donors.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AvatarImage name={d.memberName} avatarUrl={d.memberAvatarUrl} size={32} bg="#e5e5e5" color="#888" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: '0.8rem', fontWeight: 500, color: '#111' }}>{d.memberName}</div>
                  <div style={{ fontFamily: FONT, fontSize: '0.65rem', color: '#aaa' }}>{d.durationMin}분 · {d.amount.toLocaleString()}원</div>
                </div>
                {d.memberId === memberId && (
                  <div style={{ fontSize: '0.65rem', color: '#888', flexShrink: 0 }}>나</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
