'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/infrastructure/supabase/browser-client'
import Image from 'next/image'

type Props = {
  error?: string
}

export function LoginForm({ error }: Props) {
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail]         = useState('')
  const [sent, setSent]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [emailError, setEmailError] = useState('')

  async function handleKakao() {
    const supabase = createBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setEmailError('이메일을 입력해주세요'); return }
    setLoading(true)
    setEmailError('')
    const supabase = createBrowserClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (err) { setEmailError(err.message); return }
    setSent(true)
  }

  return (
    <div style={{
      position: 'relative', width: '100%', minHeight: '100vh',
      background: 'linear-gradient(-45deg, #0f1923, #1e3a5f, #2E91FC, #162d4a, #0f1923)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 8s ease infinite',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: 'var(--font-raleway)',
    }}>
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 상단: 로고 + 인용구 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 32px 40px',
      }}>
        <div style={{
          fontSize: '0.56rem', fontWeight: 700, letterSpacing: '3.5px',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
          marginBottom: '22px',
        }}>
          Mindful Running
        </div>

        <div style={{ marginBottom: '30px', animation: 'floatLogo 4s ease-in-out infinite' }}>
          <Image
            src="/icon-512.png"
            alt="Mindful Running"
            width={80}
            height={80}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.92 }}
          />
        </div>

        <div style={{
          fontSize: '0.96rem', fontWeight: 300, fontStyle: 'italic',
          color: 'rgba(255,255,255,0.8)', textAlign: 'center',
          lineHeight: 1.8, maxWidth: '255px',
        }}>
          "할 수 있는 달리기를 하다보면<br />
          <strong style={{ fontStyle: 'normal', fontWeight: 700, color: '#fff' }}>
            할 수 없는 달리기를
          </strong>
          <br />하게된다"
        </div>

        {error === 'expired' && (
          <div style={{
            marginTop: '20px', padding: '10px 18px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
            fontSize: '0.75rem', color: '#fca5a5', textAlign: 'center',
          }}>
            링크가 만료되었습니다. 다시 요청해주세요
          </div>
        )}
      </div>

      {/* 하단: 원형 아이콘 버튼들 */}
      <div style={{
        paddingBottom: '60px', display: 'flex',
        flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', padding: '0 32px 60px',
      }}>
        <div style={{
          fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)',
          letterSpacing: '2px', textTransform: 'uppercase',
        }}>로그인</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* 카카오 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleKakao}
              style={{
                width: '62px', height: '62px', borderRadius: '50%',
                background: '#FEE500', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(254,229,0,0.45)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 38 38">
                <path d="M19 4C10.716 4 4 9.373 4 16c0 4.264 2.677 8.016 6.726 10.243L9.2 32.5l7.07-4.67A17.6 17.6 0 0019 28c8.284 0 15-5.373 15-12S27.284 4 19 4z" fill="#191919"/>
              </svg>
            </button>
            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>카카오</span>
          </div>

          {/* 이메일 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowEmail(v => !v)}
              style={{
                width: '62px', height: '62px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.85)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3"/>
                <polyline points="2,4 12,13 22,4"/>
              </svg>
            </button>
            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>이메일</span>
          </div>
        </div>

        {/* 이메일 입력창 */}
        {showEmail && !sent && (
          <form
            onSubmit={handleMagicLink}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '18px',
              padding: '16px 18px',
              display: 'flex', flexDirection: 'column', gap: '12px',
              animation: 'slideUp 0.25s ease',
            }}
          >
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              이메일로 로그인 링크 받기
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  borderBottom: '1.5px solid rgba(255,255,255,0.3)',
                  outline: 'none', fontFamily: 'var(--font-roboto)',
                  fontSize: '0.88rem', color: '#fff', padding: '6px 0',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#fff', color: '#2d3031', border: 'none',
                  borderRadius: '10px', padding: '9px 14px',
                  fontFamily: 'var(--font-raleway)', fontSize: '0.7rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {loading ? '전송 중' : '전송'}
              </button>
            </div>
            {emailError && (
              <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>{emailError}</div>
            )}
          </form>
        )}

        {sent && (
          <div style={{
            width: '100%', padding: '16px 18px', borderRadius: '18px',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            textAlign: 'center', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)',
            animation: 'slideUp 0.25s ease',
          }}>
            ✉️ 이메일을 확인해주세요
          </div>
        )}
      </div>
    </div>
  )
}
