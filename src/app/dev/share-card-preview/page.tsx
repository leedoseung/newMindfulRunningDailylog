'use client'
import { ShareCard } from '@/presentation/components/feed/share-card'

const FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
const W = 375
const PHOTO = 'https://picsum.photos/seed/run/800/1200'

const mockRun = {
  id: 'preview', memberId: 'm1', memberName: '이두승',
  memberAvatarUrl: '', memberInstaId: '@leedoseung',
  date: '2026-06-05', runTime: '07:30', durationMin: 65,
  title: '오늘도 한강을 달렸다',
  thoughtBefore: '새벽 공기가 맑아서 나가기 전부터 설렸다. 오늘은 여유롭게.',
  thoughtDuring: '강바람이 시원했고 리듬이 잘 맞았다.',
  thoughtAfter: '65분이 이렇게 빨리 지나갔다니. 뿌듯함이 하루를 채워준다.',
  location: '한강 잠원지구', photoUrl: PHOTO,
  createdAt: '2026-06-05T07:30:00Z', likeCount: 5, commentCount: 2,
}

type RunMock = typeof mockRun

function FullBleedCard({ height, label, run }: { height: number; label: string; run: RunMock }) {
  const thoughts = [
    { label: '전', text: run.thoughtBefore },
    { label: '중', text: run.thoughtDuring },
    { label: '후', text: run.thoughtAfter },
  ].filter(t => t.text)
  return (
    <div>
      <p style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</p>
      <div style={{ width: W, height, position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTO} alt="" crossOrigin="anonymous"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 52%, rgba(0,0,0,0.97) 100%)',
        }} />
        {/* 상단: 로고 + 날짜 */}
        <div style={{
          position: 'absolute', top: 22, left: 22, right: 22,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '2.5px',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', fontFamily: FONT,
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            }}>Mindful Running</span>
          </span>
          <span style={{
            fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: '1px', fontFamily: FONT,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}>{run.date}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 22px 24px' }}>
          {run.title && (
            <div style={{
              fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: FONT,
              lineHeight: 1.25, letterSpacing: '-0.3px', marginBottom: 8,
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            }}>"{run.title}"</div>
          )}
          {/* 메타: 달린시간 · 장소 · 이름 */}
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14,
          }}>
            {[`${run.durationMin}분`, run.location, run.memberName].filter(Boolean).map(v => (
              <span key={v} style={{
                fontSize: 10, fontWeight: 600, color: '#fff',
                background: 'rgba(255,255,255,0.18)', borderRadius: 20,
                padding: '3px 10px', fontFamily: FONT, letterSpacing: '0.3px',
                backdropFilter: 'blur(4px)',
              }}>{v}</span>
            ))}
          </div>
          {thoughts.map(({ label: l, text }, i) => (
            <div key={l} style={{
              display: 'flex', gap: 10, padding: '8px 0',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}>
              <span style={{
                fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)', width: 16, flexShrink: 0, paddingTop: 2, fontFamily: FONT,
              }}>{l}</span>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, fontFamily: FONT,
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{text}</span>
            </div>
          ))}
          <div style={{
            marginTop: 16, paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.22)', textAlign: 'center', fontFamily: FONT,
          }}>Mindful Running</div>
        </div>
      </div>
    </div>
  )
}

const mockRunLong = {
  ...mockRun,
  title: '비 오는 날 억지로 나갔다가 결국 잘 달렸다',
  thoughtBefore: '오늘은 정말 나가기 싫었다. 비도 오고 피곤하고 핑계거리가 넘쳤다. 그래도 신발을 신었다.',
  thoughtDuring: '처음 5분은 몸이 무거웠는데 10분쯤 지나니까 오히려 빗속 달리기가 너무 좋았다. 아무도 없는 공원, 빗소리, 발소리. 완전한 나만의 시간이었다.',
  thoughtAfter: '집에 돌아와서 따뜻한 물로 샤워하면서 생각했다. 나가기 싫었던 날일수록 달리고 나면 더 뿌듯하다. 이게 마풀런이구나 싶었다. 내일도 나갈 것 같다.',
}

export default function ShareCardPreviewPage() {
  return (
    <div style={{ background: '#555', minHeight: '100vh', padding: 40, display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
      <FullBleedCard height={667} run={mockRun} label="B안 — 짧은 글" />
      <FullBleedCard height={667} run={mockRunLong} label="B안 — 긴 글 (오버플로 확인)" />
    </div>
  )
}
