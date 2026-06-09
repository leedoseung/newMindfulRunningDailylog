import type { RunLog } from '@/domain/entities/run-log'
import { AvatarImage } from '../shared/avatar-image'
import { toTransformedUrl } from '@/infrastructure/supabase/image-url'

export type CardType = 'hero' | 'photo' | 'white'

type Props = {
  run: RunLog
  cardType: CardType
  onClick: (run: RunLog) => void
}

function timeAgo(dateStr: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000
  )
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}

const THEME = {
  hero: {
    card: '#111111', name: '#fff', time: '#555',
    badge: 'rgba(255,255,255,0.1)', badgeText: '#fff',
    quote: '#fff', snippet: '#555',
    divider: 'rgba(255,255,255,0.07)',
    chip: 'rgba(255,255,255,0.08)', chipText: '#888',
    av: 'rgba(255,255,255,0.14)',
  },
  photo: {
    card: 'transparent', name: 'rgba(255,255,255,0.9)', time: 'rgba(255,255,255,0.45)',
    badge: 'rgba(255,255,255,0.18)', badgeText: '#fff',
    quote: '#fff', snippet: 'rgba(255,255,255,0.55)',
    divider: 'rgba(255,255,255,0.12)',
    chip: 'rgba(255,255,255,0.14)', chipText: 'rgba(255,255,255,0.7)',
    av: 'rgba(255,255,255,0.18)',
  },
  white: {
    card: '#fff', name: '#111111', time: '#999',
    badge: 'rgba(0,0,0,0.05)', badgeText: '#555',
    quote: '#111111', snippet: '#777',
    divider: 'rgba(0,0,0,0.05)',
    chip: '#F7F7F5', chipText: '#666',
    av: '#111111',
  },
}

export function RunCard({ run, cardType, onClick }: Props) {
  const t = THEME[cardType]
  const isPhoto = cardType === 'photo'
  const isHero  = cardType === 'hero'

  const chips: string[] = []
  if (run.location) chips.push(`📍 ${run.location}`)
  if (run.photoUrl) chips.push('📸 사진')

  const content = (
    <>
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0' }}>
        <AvatarImage
          name={run.memberName}
          avatarUrl={run.memberAvatarUrl}
          size={32}
          bg={t.av}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.78rem', fontWeight: 500, color: t.name }}>
            {run.memberName}
          </div>
          <div style={{ fontSize: '0.6rem', color: t.time, marginTop: 1 }}>
            {timeAgo(run.date)}{run.location ? ` · ${run.location}` : ''}
          </div>
        </div>
        <div style={{
          fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.72rem', fontWeight: 500,
          color: t.badgeText, background: t.badge,
          padding: '4px 10px', borderRadius: 20, flexShrink: 0,
        }}>
          {run.durationMin}분
        </div>
      </div>

      {/* Hero big number */}
      {isHero && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, padding: '4px 16px 0' }}>
          <span style={{
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '4.5rem', fontWeight: 300,
            color: '#fff', lineHeight: 1, letterSpacing: '-3px',
          }}>
            {run.durationMin}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 300, color: '#555' }}>분</span>
        </div>
      )}

      {/* Quote + snippet */}
      <div style={{ padding: isHero ? '6px 16px 14px' : '12px 16px 14px' }}>
        {run.title && (
          <div style={{
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1.05rem', fontWeight: 500,
            color: t.quote, lineHeight: 1.45, wordBreak: 'keep-all',
          }}>
            "{run.title}"
          </div>
        )}
        {(run.thoughtBefore || run.thoughtDuring || run.thoughtAfter) && (
          <div style={{
            fontSize: '0.72rem', color: t.snippet, lineHeight: 1.6, marginTop: 6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {run.thoughtBefore || run.thoughtDuring || run.thoughtAfter}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: t.divider, margin: '0 16px' }} />

      {/* Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 14px', flexWrap: 'wrap' }}>
        {run.likeCount > 0 && (
          <div style={{
            background: t.chip, borderRadius: 20, padding: '4px 10px',
            fontSize: '0.6rem', fontWeight: 500, color: t.chipText,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ❤ {run.likeCount}
          </div>
        )}
        {chips.length > 0 ? chips.map(c => (
          <div key={c} style={{
            background: t.chip, borderRadius: 20, padding: '4px 10px',
            fontSize: '0.6rem', fontWeight: 500, color: t.chipText,
          }}>{c}</div>
        )) : (
          <div style={{ fontSize: '0.6rem', color: t.chipText, opacity: 0.5 }}>{run.date}</div>
        )}
      </div>
    </>
  )

  return (
    <button
      type="button"
      onClick={() => onClick(run)}
      style={{
        background: t.card, borderRadius: 22, overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        cursor: 'pointer', width: '100%', border: 'none',
        textAlign: 'left', display: 'block', position: 'relative',
        minHeight: isPhoto ? 220 : undefined,
        transition: 'transform 0.18s cubic-bezier(0.34,1.2,0.64,1)',
      }}
    >
      {isPhoto ? (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${toTransformedUrl(run.photoUrl, 800)})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>{content}</div>
        </>
      ) : content}
    </button>
  )
}
