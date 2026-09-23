'use client'

import { useEffect, useRef, useState } from 'react'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import {
  ACHIEVEMENT_ORDER,
  getAchievement,
  type AchievementCode,
} from '@/domain/badges/achievement-catalog'
function ShareStamp({ cell }: { cell: MissionDayCell }) {
  const base: React.CSSProperties = {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    boxSizing: 'border-box',
    display: 'block',
  }
  if (cell.state === 'done') {
    return (
      <span
        style={{
          ...base,
          border: '1.5px solid #111',
          backgroundImage: "url('/icon-192-red.png')",
          backgroundSize: '75%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    )
  }
  if (cell.state === 'rest') {
    return (
      <span
        style={{
          ...base,
          background: '#E8F5EC',
          border: '1.5px solid #1e7e34',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          lineHeight: 1,
        }}
      >
        🌿
      </span>
    )
  }
  if (cell.state === 'partial') {
    return (
      <span
        style={{
          ...base,
          background: '#f4d0cf',
          border: '1px solid #d4a017',
          opacity: 0.85,
        }}
      />
    )
  }
  if (cell.state === 'pass') {
    return (
      <span
        style={{
          ...base,
          border: '1px solid #c8c8c4',
          background:
            'repeating-linear-gradient(45deg, #f0f0ee 0px, #f0f0ee 2px, #ffffff 2px, #ffffff 4px)',
        }}
      />
    )
  }
  if (cell.state === 'miss') {
    return (
      <span
        style={{
          ...base,
          background: '#fef5f5',
          border: '1px solid #f0e0e0',
        }}
      />
    )
  }
  return (
    <span
      style={{
        ...base,
        background: 'transparent',
        border: '1px dashed #d8d8d4',
      }}
    />
  )
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const RANK = new Map(ACHIEVEMENT_ORDER.map((c, i) => [c as string, i]))

type Props = {
  name: string
  generation: string
  challengeTitle: string
  startDate: string
  endDate: string
  achievements: AchievementCode[]
  stats: {
    totalReps: number
    maxStreak: number
    runDays: number
    restDays: number
    passesUsed: number
  }
  stamps: MissionDayCell[]
}

function sortCodes(codes: AchievementCode[]): AchievementCode[] {
  return [...codes].sort((a, b) => (RANK.get(a) ?? 99) - (RANK.get(b) ?? 99))
}

function formatDate(d: string): string {
  return d.replaceAll('-', '.')
}

export function FinisherStampLauncher({
  name,
  generation,
  challengeTitle,
  startDate,
  endDate,
  achievements,
  stats,
  stamps,
}: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  async function saveImage() {
    if (!cardRef.current || saving) return
    setSaving(true)
    setSavedNotice(null)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
        // html2canvas v1.4.1 doesn't parse oklch()/lab() — inject hex
        // fallbacks so inherited CSS variables don't throw.
        onclone: (doc: Document) => {
          const s = doc.createElement('style')
          s.textContent = `:root{
            --background:#f5f5f5;--foreground:#202020;
            --card:#ffffff;--card-foreground:#202020;
            --popover:#ffffff;--popover-foreground:#202020;
            --primary:#202020;--primary-foreground:#fafafa;
            --secondary:#f5f5f5;--secondary-foreground:#202020;
            --muted:#f5f5f5;--muted-foreground:#737373;
            --accent:#f5f5f5;--accent-foreground:#202020;
            --destructive:#e53935;
            --border:#e8e8e8;--input:#e8e8e8;--ring:#aaaaaa;
            --chart-1:#202020;--chart-2:#737373;--chart-3:#595959;
            --chart-4:#474747;--chart-5:#313131;
            --sidebar:#fafafa;--sidebar-foreground:#202020;
            --sidebar-primary:#202020;--sidebar-primary-foreground:#fafafa;
            --sidebar-accent:#f5f5f5;--sidebar-accent-foreground:#202020;
            --sidebar-border:#e8e8e8;--sidebar-ring:#aaaaaa;
          }`
          doc.head.appendChild(s)
        },
      })
      canvas.toBlob(async blob => {
        if (!blob) throw new Error('empty blob')
        const file = new File([blob], `lunge-s1-${name}.png`, { type: 'image/png' })
        const nav = navigator as Navigator & {
          canShare?: (data: ShareData) => boolean
          share?: (data: ShareData) => Promise<void>
        }
        if (nav.share && nav.canShare?.({ files: [file] })) {
          try {
            await nav.share({ files: [file], title: `${name}의 100일`, text: `${challengeTitle}` })
            setSavedNotice('공유 완료')
            return
          } catch {
            // fall through to download
          }
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lunge-s1-${name}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setSavedNotice('저장 완료 — 사진첩에서 확인하세요')
      }, 'image/png')
    } catch (err) {
      setSavedNotice(`저장 실패: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const sortedAchievements = sortCodes(achievements)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontFamily: FONT,
          alignSelf: 'flex-start',
          background: '#111',
          color: '#FBF6ED',
          border: 'none',
          borderRadius: 999,
          padding: '9px 16px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          cursor: 'pointer',
          marginTop: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        🎯 도장 펴기
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,10,12,0.72)',
            backdropFilter: 'blur(4px)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 16px 24px',
            overflowY: 'auto',
            fontFamily: FONT,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              width: '100%',
              maxWidth: 380,
            }}
          >
            {/* Shareable card */}
            <div
              ref={cardRef}
              style={{
                width: '100%',
                background:
                  'radial-gradient(120% 140% at 100% 0%, rgba(244,114,182,0.18) 0%, rgba(167,139,250,0.10) 40%, transparent 65%),' +
                  'radial-gradient(80% 100% at 0% 100%, rgba(56,189,248,0.14) 0%, transparent 60%),' +
                  '#151114',
                color: '#FBF6ED',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 30px 60px rgba(21,17,20,0.5)',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 22,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p
                  style={{
                    fontSize: '0.55rem',
                    letterSpacing: '0.36em',
                    textTransform: 'uppercase',
                    color: 'rgba(245,240,232,0.5)',
                    margin: 0,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  SEASON 01 · LUNGE 100
                </p>
                <h2
                  style={{
                    fontSize: '1.7rem',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1,
                    margin: '12px 0 4px',
                    color: '#FBF6ED',
                  }}
                >
                  {name}의 100일
                </h2>
                <p
                  style={{
                    fontSize: '0.68rem',
                    color: 'rgba(245,240,232,0.5)',
                    margin: 0,
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                  }}
                >
                  {formatDate(startDate)} — {formatDate(endDate)} · {generation}
                </p>
              </div>

              {/* Stamps grid — html2canvas-safe (no hue-rotate filters) */}
              <div
                style={{
                  margin: '20px 0 0',
                  position: 'relative',
                  zIndex: 1,
                  background: '#FBF6ED',
                  borderRadius: 16,
                  padding: 10,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(10, 1fr)',
                    gap: 3,
                    width: '100%',
                  }}
                >
                  {stamps.map(cell => (
                    <ShareStamp key={cell.dayIndex} cell={cell} />
                  ))}
                </div>
              </div>

              {/* Stats + Achievements */}
              <div style={{ marginTop: 20, position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 6,
                  }}
                >
                  <StatMini label="런지" value={stats.totalReps.toLocaleString()} />
                  <StatMini label="연속" value={`${stats.maxStreak}일`} />
                  <StatMini label="쉼" value={`${stats.restDays}일`} />
                </div>

                {sortedAchievements.length > 0 && (
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '14px 0 0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 5,
                    }}
                  >
                    {sortedAchievements.map(c => {
                      const entry = getAchievement(c)
                      if (!entry) return null
                      return (
                        <li
                          key={c}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'rgba(245,240,232,0.08)',
                            border: '1px solid rgba(245,240,232,0.15)',
                            borderRadius: 999,
                            padding: '4px 8px',
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'rgba(251,246,237,0.92)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>{entry.icon}</span>
                          {entry.label}
                        </li>
                      )
                    })}
                  </ul>
                )}

                <p
                  style={{
                    fontSize: '0.6rem',
                    color: 'rgba(245,240,232,0.4)',
                    margin: '16px 0 0',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  매일 마인드풀 러닝
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                type="button"
                onClick={saveImage}
                disabled={saving}
                style={{
                  flex: 1,
                  fontFamily: FONT,
                  background: '#FBF6ED',
                  color: '#151114',
                  border: 'none',
                  borderRadius: 14,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? '만드는 중…' : '📸 이미지로 저장 / 공유'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: FONT,
                  background: 'transparent',
                  color: 'rgba(251,246,237,0.72)',
                  border: '1px solid rgba(251,246,237,0.28)',
                  borderRadius: 14,
                  padding: '12px 18px',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
            {savedNotice && (
              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(251,246,237,0.72)',
                  margin: 0,
                  textAlign: 'center',
                  letterSpacing: '-0.01em',
                }}
              >
                {savedNotice}
              </p>
            )}
            <p
              style={{
                fontSize: 11,
                color: 'rgba(251,246,237,0.4)',
                margin: 0,
                textAlign: 'center',
                lineHeight: 1.6,
                letterSpacing: '-0.01em',
              }}
            >
              저장한 이미지를 인스타그램 스토리·피드에 올려보세요.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(245,240,232,0.06)',
        border: '1px solid rgba(245,240,232,0.10)',
        borderRadius: 12,
        padding: '10px 6px',
        textAlign: 'center',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <p style={{ fontSize: 9, color: 'rgba(245,240,232,0.5)', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p
        style={{
          fontSize: 13,
          fontWeight: 800,
          margin: '4px 0 0',
          color: '#FBF6ED',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </p>
    </div>
  )
}
