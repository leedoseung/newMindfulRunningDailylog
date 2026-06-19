'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Props = {
  memberId: string
  year: number
  month: number
  kind: 'first' | 'five' | 'ten'
  onClose: () => void
}

const COPY: Record<Props['kind'], { title: string; sub: string; emoji: string }> = {
  first: { title: '이번 달 첫 러닝!', sub: '한 달의 시작을 기록했어요', emoji: '🌱' },
  five:  { title: '이번 달 5번째 러닝', sub: '꾸준함이 쌓이고 있어요', emoji: '🔥' },
  ten:   { title: '이번 달 10번째 러닝!', sub: '대단한 한 달이에요', emoji: '🏅' },
}

export function MilestoneToast({ memberId, year, month, kind, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`
  const href = `/diary/${memberId}/${yearMonth}`
  const copy = COPY[kind]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    const auto = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 6500)
    return () => { clearTimeout(t); clearTimeout(auto) }
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        top: 70,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '-20px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 280ms cubic-bezier(0.2,0.9,0.3,1), opacity 280ms',
        zIndex: 400,
        width: 'calc(100% - 32px)',
        maxWidth: 420,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Link
        href={href}
        prefetch={false}
        onClick={() => { setVisible(false); setTimeout(onClose, 280) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textDecoration: 'none',
          background: 'linear-gradient(135deg, #7C2D92 0%, #1E1B4B 100%)',
          color: '#fff',
          borderRadius: 16,
          padding: '14px 16px',
          boxShadow: '0 10px 30px rgba(30,27,75,0.35)',
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
        }}
      >
        <div style={{
          fontSize: '1.6rem', lineHeight: 1,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.14)',
          display: 'grid', placeItems: 'center',
        }}>{copy.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '-0.3px' }}>{copy.title}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{copy.sub} · 월간 회고 보기 →</div>
        </div>
      </Link>
    </div>
  )
}
