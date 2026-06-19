'use client'

import { CardShell } from './card-shell'
import type { TitleKey } from '@/domain/diary/wrapped-stats'

type Props = {
  title: { key: TitleKey; label: string; subtitle: string }
}

const BG_BY_KEY: Record<TitleKey, string> = {
  consistent:   'linear-gradient(160deg, #047857 0%, #064E3B 100%)',
  weekend:      'linear-gradient(160deg, #BE185D 0%, #4C1D95 100%)',
  longDistance: 'linear-gradient(160deg, #B45309 0%, #7C2D12 100%)',
  earlyBird:    'linear-gradient(160deg, #F59E0B 0%, #C2410C 100%)',
  nightOwl:     'linear-gradient(160deg, #0F172A 0%, #312E81 100%)',
  starter:      'linear-gradient(160deg, #0EA5E9 0%, #1E40AF 100%)',
  comeback:     'linear-gradient(160deg, #7C3AED 0%, #1E1B4B 100%)',
}

const EMOJI_BY_KEY: Record<TitleKey, string> = {
  consistent: '🏃',
  weekend: '🌅',
  longDistance: '🏔️',
  earlyBird: '🌄',
  nightOwl: '🌙',
  starter: '🌱',
  comeback: '⚡',
}

export function TitleCard({ title }: Props) {
  return (
    <CardShell label="타이틀 카드" bg={BG_BY_KEY[title.key]}>
      <p style={{ margin: '0 0 18px', fontSize: '0.95rem', fontWeight: 500, opacity: 0.7, letterSpacing: '0.04em' }}>
        이번 달 너의 이름은
      </p>

      <div style={{ fontSize: '3.6rem', lineHeight: 1, marginBottom: 18 }}>
        {EMOJI_BY_KEY[title.key]}
      </div>

      <p style={{
        margin: '0 0 12px',
        fontSize: '2.6rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        lineHeight: 1.15,
        background: 'linear-gradient(90deg, #FFFFFF, rgba(255,255,255,0.7))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {title.label}
      </p>

      <p style={{ margin: '0 32px', fontSize: '1rem', fontWeight: 400, opacity: 0.85, lineHeight: 1.5 }}>
        {title.subtitle}
      </p>
    </CardShell>
  )
}
