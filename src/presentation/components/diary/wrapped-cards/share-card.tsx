'use client'

import Link from 'next/link'
import { ShareButton } from '@/presentation/components/diary/share-button'
import { CardShell } from './card-shell'

type Props = {
  year: number
  month: number
  shareUrl: string
  allUrl: string
  onReplay: () => void
  memberName: string
}

export function ShareCard({
  year,
  month,
  shareUrl,
  allUrl,
  onReplay,
  memberName,
}: Props) {
  return (
    <CardShell
      label="공유 카드"
      bg="linear-gradient(180deg, #7C2D92, #0F172A)"
    >
      <p
        style={{
          margin: '0 0 16px',
          fontSize: '2.5rem',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        🎉
      </p>

      <h2
        style={{
          margin: '0 0 8px',
          fontSize: '2.4rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.2,
          whiteSpace: 'pre-line',
        }}
      >
        {'다음 달도\n달려보자.'}
      </h2>

      <p
        style={{
          margin: '0 0 36px',
          fontSize: '0.875rem',
          fontWeight: 400,
          opacity: 0.65,
        }}
      >
        {year}.{month} 마감
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
          width: '100%',
          maxWidth: '280px',
        }}
      >
        <ShareButton
          url={shareUrl}
          title={`${year}.${month} 달리기 일기`}
          text={`${memberName}의 ${year}.${month} 달리기 일기`}
        >
          ↗ 공유하기
        </ShareButton>

        <button
          type="button"
          onClick={onReplay}
          style={{
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: 999,
            padding: '12px 24px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: 44,
            minWidth: '100%',
            fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
            letterSpacing: '-0.01em',
          }}
        >
          ↻ 처음부터
        </button>
      </div>

      <Link
        href={allUrl}
        prefetch={false}
        style={{
          marginTop: '28px',
          fontSize: '0.8125rem',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.6)',
          textDecoration: 'none',
          letterSpacing: '0.01em',
        }}
      >
        전체 일기 보기 →
      </Link>
    </CardShell>
  )
}
