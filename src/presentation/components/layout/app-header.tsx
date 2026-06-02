import Image from 'next/image'
import Link from 'next/link'
import { AvatarImage } from '../shared/avatar-image'
import { NotificationBell } from './notification-bell'

type Props = {
  memberName?: string
  memberAvatarUrl?: string
  memberId?: string
}

export function AppHeader({ memberName, memberAvatarUrl, memberId = '' }: Props) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '52px 20px 14px',
      background: 'rgba(247,247,245,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Logo + wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Image
            src="/icon-192.png"
            alt="Mindful Running"
            width={32}
            height={32}
            style={{ mixBlendMode: 'multiply', objectFit: 'contain' }}
            priority
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
            fontSize: '0.5rem',
            fontWeight: 700,
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            color: '#111',
            lineHeight: 1,
          }}>
            Mindful Running
          </span>
          <span style={{
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
            fontSize: '0.42rem',
            fontWeight: 400,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#999',
            lineHeight: 1,
          }}>
            Dailylog
          </span>
        </div>
      </div>

      {/* 알림 벨 + 프로필 아바타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {memberId && (
          <NotificationBell
            memberId={memberId}
            memberName={memberName ?? ''}
            memberAvatarUrl={memberAvatarUrl ?? ''}
          />
        )}
        {memberName ? (
          <Link
            href="/profile"
            style={{
              display: 'block', borderRadius: '50%', flexShrink: 0,
              textDecoration: 'none',
              boxShadow: '0 0 0 2px rgba(0,0,0,0.08)',
            }}
          >
            <AvatarImage
              name={memberName}
              avatarUrl={memberAvatarUrl ?? ''}
              size={34}
              bg="#111111"
              color="#fff"
            />
          </Link>
        ) : (
          <div style={{ width: 34 }} />
        )}
      </div>
    </header>
  )
}
