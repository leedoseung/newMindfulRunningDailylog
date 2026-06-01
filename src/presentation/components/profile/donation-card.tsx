'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
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

function DonationInfoModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '90vh', overflowY: 'auto',
          background: '#fff', borderRadius: '20px 20px 0 0',
          padding: '0 0 48px',
        }}
      >
        {/* 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E0' }} />
        </div>

        {/* 닫기 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px 0' }}>
          <button type="button" onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.4rem', color: '#aaa', lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* 이미지 */}
        <div style={{ position: 'relative', width: '100%', height: 220, marginBottom: 20 }}>
          <Image
            src="/images/kibet4kids.jpg"
            alt="Kibet4Kids Foundation - 케냐 이텐 마을 아이들"
            fill
            style={{ objectFit: 'cover' }}
            sizes="100vw"
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.55) 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 14, left: 20, right: 20,
            fontFamily: FONT, fontSize: '1.1rem', fontWeight: 700, color: '#fff',
            lineHeight: 1.3,
          }}>
            Kibet4Kids Foundation
          </div>
        </div>

        <div style={{ padding: '0 22px' }}>
          {/* 소개 */}
          <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: '#333', lineHeight: 1.7, marginBottom: 22 }}>
            케냐 이텐 마을 아이들의 더 나은 교육 환경을 위해 활동하는 재단입니다.<br />
            우리의 달리기가 아이들의 미래를 밝히는 소중한 발걸음이 됩니다.
          </p>

          {/* 주요 활동 */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: '#888', letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: 12 }}>
              재단의 주요 활동
            </div>
            {[
              { icon: '🏫', title: '교실 신축 및 보수', desc: '한 교실에서 두 반이 수업하는 열악한 환경을 개선하여 아이들에게 쾌적한 학습 공간을 제공합니다.' },
              { icon: '💧', title: '식수 및 위생시설 설치', desc: '빗물 탱크와 위생적인 화장실을 만들어 아이들의 건강을 지키고 질병 위험을 줄입니다.' },
              { icon: '📚', title: '학용품 및 체육용품 지원', desc: '교과서, 노트, 연필부터 축구공까지 아이들의 공부와 놀이에 필요한 다양한 물품을 제공합니다.' },
            ].map(item => (
              <div key={item.title} style={{
                display: 'flex', gap: 12, marginBottom: 12,
                background: '#F7F7F5', borderRadius: 14, padding: '12px 14px',
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: '0.8rem', fontWeight: 600, color: '#111', marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontFamily: FONT, fontSize: '0.75rem', color: '#666', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 참여 방법 */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: '#888', letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: 12 }}>
              참여 방법
            </div>
            {[
              { num: '1', title: '기부 금액 계산', desc: '매월 달린 1시간당 1,000원씩 계산합니다.\n예: 1월에 12시간 달리면 → 12,000원 기부' },
              { num: '2', title: '송금 방법', desc: '매월 말일에 성우 코치의 계좌로 보내주세요.\n카카오뱅크 3333-06-6037655 (예금주: 김성우)' },
              { num: '3', title: '투명한 운영', desc: '모금액은 다음 달 초 Kibet4Kids Foundation으로 전달되며, 기부 영수증은 마인드풀러닝스쿨 인스타그램에 공개됩니다.' },
              { num: '4', title: '나의 기부 기록하기', desc: '연말에 기부 기록을 이메일로 받아보세요. 매월 말 구글폼에 기부 내용을 기록해주시면 됩니다.' },
            ].map(item => (
              <div key={item.num} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: '#111', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginTop: 1,
                }}>{item.num}</div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: '0.8rem', fontWeight: 600, color: '#111', marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontFamily: FONT, fontSize: '0.75rem', color: '#666', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{item.desc}</div>
                </div>
              </div>
            ))}

            {/* 구글폼 링크 */}
            <a
              href="https://forms.gle/CPrte31NqKerS9r27"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', marginTop: 14, padding: '12px 16px',
                background: '#111', borderRadius: 12, textDecoration: 'none',
                fontFamily: FONT, fontSize: '0.8rem', fontWeight: 600, color: '#fff',
                textAlign: 'center',
              }}
            >
              📋 기부 기록 구글폼 작성하기
            </a>
          </div>

          {/* 함께하는 의미 */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: 16, padding: '18px 18px',
          }}>
            <div style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: 10 }}>
              함께하는 의미
            </div>
            <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, margin: 0 }}>
              우리의 달리기는 단순한 운동을 넘어 케냐 이텐 마을 아이들의 미래를 밝히는 소중한 발걸음이 됩니다.<br /><br />
              함께 달리고, 함께 나누는 마인드풀러닝의 여정에 동참해 주셔서 감사합니다 :)
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function DonationCard({ allRuns, memberId, memberName = '', memberAvatarUrl = '' }: Props) {
  const maxMonth = prevMonth()
  const minMonth = addMonths(maxMonth, -23)

  const [selectedMonth, setSelectedMonth] = useState(maxMonth)
  const [donors, setDonors] = useState<DonationRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const monthDurationMin = allRuns
    .filter(r => r.date.startsWith(selectedMonth))
    .reduce((sum, r) => sum + r.durationMin, 0)
  const donationAmount = Math.floor(monthDurationMin / 60) * 1000
  const alreadyDonated = Boolean(memberId && donors.some(d => d.memberId === memberId))

  const loadDonors = useCallback(async (month: string) => {
    try {
      const res = await fetch(`/api/donations?month=${month}`)
      if (!res.ok) return
      const data = await res.json() as { donations: DonationRecord[] }
      setDonors(data.donations)
    } catch { /* leave existing state intact */ }
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
    window.location.href = `supertoss://send?amount=${donationAmount}&bank=${encodeURIComponent(BANK_NAMES[BANK_CODE] ?? BANK_CODE)}&accountNo=${ACCOUNT_NO}`
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
    <>
    {showInfo && <DonationInfoModal onClose={() => setShowInfo(false)} />}
    <div style={{ margin: '0 22px 32px', background: '#fff', borderRadius: 20, padding: '20px 20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 600, color: '#888', letterSpacing: '1.8px', textTransform: 'uppercase' }}>
          🫀 달리기 기부 마일리지
        </div>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '1.5px solid #D0D0D0', background: '#F7F7F5',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT, fontSize: '0.7rem', fontWeight: 700, color: '#888',
            flexShrink: 0,
          }}
        >?</button>
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
            {Math.floor(monthDurationMin / 60)}<span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#999', marginLeft: 2 }}>시간</span>
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
    </>
  )
}
