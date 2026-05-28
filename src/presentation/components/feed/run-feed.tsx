'use client'

import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { RunCard } from './run-card'
import { DetailSheet } from './detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  runs: RunLog[]
  triggerRun?: RunLog | null
  onTriggerConsumed?: () => void
  memberId?: string
}

const GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #6a3093 0%, #a044ff 100%)',
  'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)',
  'linear-gradient(135deg, #e96c4c 0%, #c41818 100%)',
]

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

// 좌우 열의 높이 패턴 — 서로 어긋나게 배치해 마소리 느낌
const HEIGHTS_L: number[] = [200, 130, 170, 115, 190, 145]
const HEIGHTS_R: number[] = [130, 195, 115, 175, 140, 200]
const hL = (i: number) => HEIGHTS_L[i % HEIGHTS_L.length]!
const hR = (i: number) => HEIGHTS_R[i % HEIGHTS_R.length]!

function GridCell({ run, height, onClick }: { run: RunLog; height: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16, overflow: 'hidden',
        position: 'relative', height,
        cursor: 'pointer', flexShrink: 0,
        background: run.photoUrl ? '#111' : getGradient(run.memberId),
      }}
    >
      {run.photoUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${run.photoUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.72) 100%)',
      }} />
      {!run.photoUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingBottom: 36,
        }}>
          <AvatarImage
            name={run.memberName}
            avatarUrl={run.memberAvatarUrl}
            size={44}
            bg="rgba(255,255,255,0.2)"
            color="#fff"
          />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px' }}>
        <div style={{
          fontFamily: FONT, fontSize: '0.62rem', fontWeight: 600,
          color: '#fff', marginBottom: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {run.memberName}
        </div>
        {run.title && (
          <div style={{
            fontFamily: FONT, fontSize: '0.52rem',
            color: 'rgba(255,255,255,0.78)', lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            "{run.title}"
          </div>
        )}
      </div>
    </div>
  )
}

const PAGE_LIMIT = 20

export function PhotoGrid({ runs: initialRuns, memberId, triggerRun, onTriggerConsumed, initialOffset = PAGE_LIMIT }: {
  runs: RunLog[]
  memberId?: string
  triggerRun?: RunLog | null
  onTriggerConsumed?: () => void
  initialOffset?: number
}) {
  const [selected, setSelected] = useState<RunLog | null>(null)
  const [runs, setRuns] = useState<RunLog[]>(initialRuns)
  const [offset, setOffset] = useState(initialOffset)
  const [hasMore, setHasMore] = useState(initialRuns.length === PAGE_LIMIT)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!triggerRun) return
    setSelected(triggerRun)
    onTriggerConsumed?.()
  }, [triggerRun])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetch(`/api/runs?offset=${offset}&limit=${PAGE_LIMIT}`)
      const json = await res.json() as { runs: RunLog[]; hasMore: boolean }
      setRuns(prev => [...prev, ...json.runs])
      setOffset(prev => prev + json.runs.length)
      setHasMore(json.hasMore)
    } catch {
      // silent fail — user can scroll up and back to retry
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, offset])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const leftRuns  = runs.filter((_, i) => i % 2 === 0)
  const rightRuns = runs.filter((_, i) => i % 2 !== 0)

  return (
    <>
      {runs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '0.875rem' }}>
          최근 달리기 기록이 없습니다
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 0' }}>
          {/* 왼쪽 열 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {leftRuns.map((run, rowIdx) => (
              <GridCell
                key={run.id}
                run={run}
                height={hL(rowIdx)}
                onClick={() => setSelected(run)}
              />
            ))}
          </div>
          {/* 오른쪽 열 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rightRuns.map((run, rowIdx) => (
              <GridCell
                key={run.id}
                run={run}
                height={hR(rowIdx)}
                onClick={() => setSelected(run)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 무한스크롤 센티넬 */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && (
        <div style={{ textAlign: 'center', padding: '16px 0 40px', color: '#bbb', fontSize: '0.75rem' }}>
          불러오는 중...
        </div>
      )}
      {!hasMore && runs.length > 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0 40px', color: '#ccc', fontSize: '0.65rem', letterSpacing: '1px' }}>
          • • •
        </div>
      )}

      {selected && (
        <DetailSheet run={selected} open={Boolean(selected)} onClose={() => setSelected(null)} memberId={memberId} />
      )}
    </>
  )
}

export function RunFeed({ runs, triggerRun, onTriggerConsumed, memberId }: Props) {
  const [selected, setSelected] = useState<RunLog | null>(null)

  useEffect(() => {
    if (!triggerRun) return
    const id = setTimeout(() => {
      document.getElementById(`run-${triggerRun.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setSelected(triggerRun)
      onTriggerConsumed?.()
    }, 60)
    return () => clearTimeout(id)
  }, [triggerRun])

  function cardType(run: RunLog, i: number): 'hero' | 'photo' | 'white' {
    if (i === 0) return 'hero'
    if (run.photoUrl) return 'photo'
    return 'white'
  }

  return (
    <>
      <div data-testid="run-feed" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 20px' }}>
        {runs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', padding: '40px 0 24px', fontSize: '0.875rem' }}>
            최근 달리기 기록이 없습니다
          </p>
        ) : (
          runs.map((run, i) => (
            <Fragment key={run.id}>
              <div id={`run-${run.id}`}>
                <RunCard run={run} cardType={cardType(run, i)} onClick={setSelected} />
              </div>
            </Fragment>
          ))
        )}
      </div>

      {selected && (
        <DetailSheet run={selected} open={Boolean(selected)} onClose={() => setSelected(null)} memberId={memberId} />
      )}
    </>
  )
}
