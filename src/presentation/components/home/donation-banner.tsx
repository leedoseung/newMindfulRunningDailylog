'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AvatarImage } from '../shared/avatar-image'
import type { DonationRecord } from '@/domain/entities/donation'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

function getBannerContext(): { show: boolean; month: string; label: string; sublabel: string } {
  const today = new Date()
  const day = today.getDate()
  const year = today.getFullYear()
  const month = today.getMonth() // 0-indexed

  const pad = (n: number) => String(n).padStart(2, '0')
  const thisMonth = `${year}-${pad(month + 1)}`

  if (day >= 25) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    const daysLeft = lastDay - day
    const label = daysLeft === 0 ? '오늘 기부 마감!' : `기부 마감 D-${daysLeft}`
    return { show: true, month: thisMonth, label, sublabel: '이번 달 기부자' }
  }

  if (day <= 5) {
    const prevDate = new Date(year, month - 1, 1)
    const prevMonth = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`
    const [py, pm] = prevMonth.split('-')
    return {
      show: true,
      month: prevMonth,
      label: '지난달 기부 감사합니다 🙏',
      sublabel: `${py}년 ${Number(pm)}월 기부자`,
    }
  }

  return { show: false, month: thisMonth, label: '', sublabel: '' }
}

export function DonationBanner() {
  const router = useRouter()
  const ctx = getBannerContext()
  const [donors, setDonors] = useState<DonationRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!ctx.show) return
    fetch(`/api/donations?month=${ctx.month}`)
      .then(r => r.json())
      .then((d: { donations: DonationRecord[] }) => {
        setDonors(d.donations)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [ctx.show, ctx.month])

  if (!ctx.show) return null
  if (!loaded) return null

  return (
    <div
      onClick={() => router.push('/profile')}
      style={{
        margin: '0 16px 16px',
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
        position: 'relative',
      }}
    >
      {/* 배경 그레인 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ padding: '14px 16px 14px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: '0.85rem' }}>🫀</span>
            <span style={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.5px' }}>
              {ctx.label}
            </span>
          </div>
          <div style={{
            fontFamily: FONT, fontSize: '0.55rem', fontWeight: 500,
            color: 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            Kibet4Kids
          </div>
        </div>

        {/* 기부자 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ fontFamily: FONT, fontSize: '0.52rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 2 }}>
            {ctx.sublabel} · {donors.length}명
          </div>
          {donors.length === 0 ? (
            <div style={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)', padding: '4px 0' }}>
              아직 기부자가 없어요 — 첫 번째가 되어보세요 ✨
            </div>
          ) : (
          <div style={{ display: 'flex', gap: -6, overflowX: 'hidden' }}>
            {/* 아바타 스택 */}
            <div style={{ display: 'flex', marginRight: 12 }}>
              {donors.slice(0, 6).map((d, i) => (
                <div key={d.id} style={{
                  marginLeft: i === 0 ? 0 : -8, zIndex: donors.length - i,
                  borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}>
                  <AvatarImage name={d.memberName} avatarUrl={d.memberAvatarUrl} size={28} bg="#334" color="#fff" />
                </div>
              ))}
              {donors.length > 6 && (
                <div style={{
                  marginLeft: -8, zIndex: 0, width: 28, height: 28,
                  borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT, fontSize: '0.52rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                }}>
                  +{donors.length - 6}
                </div>
              )}
            </div>

            {/* 이름 목록 (최대 3명) */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: '0.7rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {donors.slice(0, 3).map(d => d.memberName).join(', ')}
                {donors.length > 3 && ` 외 ${donors.length - 3}명`}
              </div>
              <div style={{ fontFamily: FONT, fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)' }}>
                총 {donors.reduce((s, d) => s + d.amount, 0).toLocaleString()}원 기부
              </div>
            </div>
          </div>
          )}
        </div>

        {/* 하단 CTA */}
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)' }}>
            나도 기부하기 →
          </span>
          <span style={{ fontSize: '0.7rem' }}>🇰🇪</span>
        </div>
      </div>
    </div>
  )
}
