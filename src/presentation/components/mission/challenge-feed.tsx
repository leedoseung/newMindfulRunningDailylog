'use client'

import { useEffect, useState } from 'react'
import type { ChallengeFeedItem } from '@/application/use-cases/get-challenge-feed'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = { initialItems: ChallengeFeedItem[] }

export function ChallengeFeed({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems)

  useEffect(() => {
    let cancelled = false
    const interval = setInterval(async () => {
      if (cancelled) return
      try {
        const res = await fetch('/api/challenges/feed', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setItems(data.items)
      } catch {}
    }, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (items.length === 0) {
    return (
      <section style={{
        fontFamily: FONT, background: '#fff', border: '1px solid #EBEBEB',
        borderRadius: 18, padding: 24, textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>아직 활동이 없어요</p>
      </section>
    )
  }

  return (
    <section style={{
      fontFamily: FONT, background: '#fff', border: '1px solid #EBEBEB',
      borderRadius: 18, padding: 16,
    }}>
      <p style={{ fontSize: 11, color: '#888', margin: '0 0 12px', letterSpacing: '0.05em' }}>FEED</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#EBEBEB',
              backgroundImage: item.memberAvatarUrl ? `url(${item.memberAvatarUrl})` : 'none',
              backgroundSize: 'cover',
            }} />
            <div style={{ fontSize: 13, color: '#111', flex: 1 }}>
              <strong>{item.memberName}</strong>
              <span style={{ color: '#888' }}> · {item.dayIndex + 1}일째</span>
              {item.completed && <span style={{ marginLeft: 6, color: '#b8231f' }}>✓ 달성</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
