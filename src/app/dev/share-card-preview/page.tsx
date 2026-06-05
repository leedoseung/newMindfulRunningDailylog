'use client'
import { ShareCard } from '@/presentation/components/feed/share-card'

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
  thoughtBefore: '오늘은 정말 나가기 싫었다. 비도 오고 피곤하고 핑계거리가 넘쳤다. 그래도 신발을 신었다. 문을 열고 나가는 순간 빗소리가 들렸다.',
  thoughtDuring: '처음 5분은 몸이 무거웠는데 10분쯤 지나니까 오히려 빗속 달리기가 너무 좋았다. 아무도 없는 공원, 빗소리, 발소리. 완전한 나만의 시간이었다.',
  thoughtAfter: '집에 돌아와서 따뜻한 물로 샤워하면서 생각했다. 나가기 싫었던 날일수록 달리고 나면 더 뿌듯하다. 이게 마풀런이구나 싶었다. 내일도 나갈 것 같다.',
}

const noPhoto = { ...long, photoUrl: '' }

export default function Page() {
  return (
    <div style={{ background: '#555', minHeight: '100vh', padding: 40, display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
      {[['짧은 글', short], ['긴 글', long], ['사진 없음', noPhoto]].map(([label, run]) => (
        <div key={label as string}>
          <p style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label as string}</p>
          <ShareCard run={run as typeof short} />
        </div>
      ))}
    </div>
  )
}
