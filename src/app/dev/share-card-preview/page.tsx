'use client'
import { ShareCard } from '@/presentation/components/feed/share-card'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"

function PhotoVariant({ run, photoHeight, label }: { run: RunLog; photoHeight: number; label: string }) {
  const thoughts = [
    { label: '전', text: run.thoughtBefore },
    { label: '중', text: run.thoughtDuring },
    { label: '후', text: run.thoughtAfter },
  ].filter(t => t.text)
  return (
    <div>
      <p style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</p>
      <div style={{ width: 375, background: '#0a0a0a' }}>
        <div style={{ position: 'relative', height: photoHeight, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={run.photoUrl} alt="" crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)', fontFamily: FONT, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>Mindful Running</span>
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontFamily: FONT, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{run.date}</span>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, rgba(10,10,10,0), rgba(10,10,10,1))' }} />
        </div>
        <div style={{ padding: '16px 22px 28px' }}>
          {run.title && <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: FONT, lineHeight: 1.25, letterSpacing: '-0.3px', marginBottom: 8 }}>"{run.title}"</div>}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: FONT, marginBottom: 16 }}>
            {[`${run.durationMin}분`, run.location, run.memberName].filter(Boolean).join(' · ')}
          </div>
          {thoughts.map(({ label: l, text }, i) => (
            <div key={l} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', width: 18, flexShrink: 0, paddingTop: 2, fontFamily: FONT }}>{l}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, fontFamily: FONT }}>{text}</span>
            </div>
          ))}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontFamily: FONT }}>Mindful Running</div>
        </div>
      </div>
    </div>
  )
}

const base = {
  id: 'preview', memberId: 'm1', memberName: '이두승',
  memberAvatarUrl: '', memberInstaId: '@leedoseung',
  date: '2026-06-05', runTime: '07:30', durationMin: 65,
  location: '오금천', photoUrl: 'https://picsum.photos/seed/run/800/1200',
  createdAt: '2026-06-05T07:30:00Z', likeCount: 5, commentCount: 2,
}

const short = {
  ...base,
  title: '바람이 시원하다',
  thoughtBefore: '나가기 싫었지만 신발을 신었다.',
  thoughtDuring: '바람이 시원하게 불었다.',
  thoughtAfter: '뿌듯하다.',
}

const long = {
  ...base,
  title: '비 오는 날 억지로 나갔다가 결국 잘 달렸다',
  thoughtBefore: '오늘은 정말 나가기 싫었다. 비도 오고 피곤하고 핑계거리가 넘쳤다. 어제 야근하고 오늘도 회의가 줄줄이었다. 그런데도 운동복을 꺼냈다. 그냥 입고 나가면 어떻게든 되겠지 싶어서. 문을 열고 나가는 순간 빗소리가 들렸다. 아 이걸 왜 나왔나 싶었다.',
  thoughtDuring: '처음 5분은 몸이 무거웠는데 10분쯤 지나니까 오히려 빗속 달리기가 너무 좋았다. 아무도 없는 공원, 빗소리, 발소리만 들렸다. 머릿속이 비워지는 느낌. 평소에 이렇게 조용한 시간이 없었는데 달리는 동안만큼은 완전한 나만의 시간이었다. 계속 달리고 싶었다.',
  thoughtAfter: '집에 돌아와서 따뜻한 물로 샤워하면서 생각했다. 나가기 싫었던 날일수록 달리고 나면 더 뿌듯하다. 몸도 가볍고 머리도 맑다. 이게 마풀런이구나 싶었다. 억지로라도 나가길 잘했다. 내일도 날씨 상관없이 나갈 것 같다.',
}

const noPhoto = { ...long, photoUrl: '' }

export default function Page() {
  return (
    <div style={{ background: '#555', minHeight: '100vh', padding: 40, display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
      <PhotoVariant run={long as RunLog} photoHeight={320} label="현재 — 320px" />
      <PhotoVariant run={long as RunLog} photoHeight={400} label="비교 — 400px" />
      <div>
        <p style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>사진 없음</p>
        <ShareCard run={noPhoto as RunLog} />
      </div>
    </div>
  )
}
