# 인증 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase Auth(카카오 OAuth + 이메일 Magic Link)로 전체 앱을 보호하고, 로그인 후 "내 기록" 탭과 본인 기록 수정/삭제를 구현한다.

**Architecture:** Next.js Middleware가 세션 쿠키를 확인해 비로그인 시 `/login`으로 리다이렉트. 첫 로그인 시 `/link-member`에서 기존 멤버와 연결(members.auth_user_id + user_metadata.member_id 동시 저장). 홈 피드에 탭 추가(전체 피드 / 내 기록), /record 페이지에서 멤버 드롭다운 제거.

**Tech Stack:** Next.js 15 App Router, Supabase Auth(`@supabase/ssr`), TypeScript, Vitest + RTL

---

## 프로젝트 위치

```
/Users/duvis/DuvisProject/newDailyMindfulRunningApp
```

## 파일 구조

**신규 생성:**
```
src/lib/auth-redirect.ts                              — 리다이렉트 순수함수 (테스트 가능)
src/middleware.ts                                     — 라우트 보호
src/app/login/page.tsx                               — 로그인 Server wrapper
src/presentation/components/auth/login-form.tsx      — 로그인 Client 컴포넌트
src/app/auth/callback/route.ts                       — OAuth/Magic Link 콜백
src/app/link-member/page.tsx                         — 첫 로그인 멤버 연결 Server
src/presentation/components/auth/link-member-form.tsx — 멤버 연결 Client 컴포넌트
src/app/api/auth/link-member/route.ts                — POST: 멤버 연결 API
src/app/api/record/[id]/route.ts                     — PUT/DELETE 본인 기록
src/presentation/components/home/home-feed.tsx       — 홈 탭 Client 컴포넌트
src/presentation/components/my-records/
  my-records-tab.tsx                                 — 내 기록 목록 + 통계
  my-record-card.tsx                                 — 기록 카드 (··· 메뉴)
public/icon-512.png                                  — 앱 로고 복사

tests/unit/lib/auth-redirect.test.ts
tests/unit/api/link-member.test.ts
tests/unit/api/record-id.test.ts
tests/unit/components/my-records-tab.test.tsx
```

**수정:**
```
src/app/page.tsx                                     — HomeFeed 컴포넌트 사용
src/app/record/page.tsx                              — memberId 세션에서 조회, edit 모드
src/presentation/components/form/run-log-form.tsx   — memberId prop, edit 모드 지원
```

---

## Supabase 사전 설정 (코드 작업 전 필수)

### 1. Supabase Dashboard에서 SQL 실행

```sql
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id);
```

### 2. 카카오 OAuth 설정 (Supabase Dashboard)

Supabase Dashboard → Authentication → Providers → Kakao → Enable
- Client ID: 카카오 개발자 콘솔의 REST API 키
- Client Secret: 카카오 개발자 콘솔의 Client Secret
- Redirect URL: `https://<supabase-project>.supabase.co/auth/v1/callback` (Dashboard에 표시됨)

### 3. 카카오 개발자 콘솔 설정

카카오 개발자 콘솔(developers.kakao.com) → 앱 → 카카오 로그인 → Redirect URI 추가:
```
https://<supabase-project>.supabase.co/auth/v1/callback
```

---

## Task 1: DB 설정 + 로고 복사

**Files:**
- Modify: Supabase DB (Dashboard SQL Editor)
- Create: `public/icon-512.png`

- [ ] **Step 1: auth_user_id 컬럼 추가**

Supabase Dashboard → SQL Editor → 실행:

```sql
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id);
```

Expected: "Success. No rows returned"

- [ ] **Step 2: 로고 파일 복사**

```bash
cp /Users/duvis/DuvisProject/mindfulRunning-apps/public/icon-512.png \
   /Users/duvis/DuvisProject/newDailyMindfulRunningApp/public/icon-512.png
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd /Users/duvis/DuvisProject/newDailyMindfulRunningApp && npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 4: Commit**

```bash
git add public/icon-512.png
git commit -m "feat: copy app logo to public dir"
```

---

## Task 2: auth-redirect 헬퍼 + 단위 테스트 (TDD)

Middleware에서 리다이렉트 로직을 순수 함수로 분리해 테스트 가능하게 만든다.

**Files:**
- Create: `src/lib/auth-redirect.ts`
- Create: `tests/unit/lib/auth-redirect.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/unit/lib/auth-redirect.test.ts
import { describe, it, expect } from 'vitest'
import { getRedirectPath } from '@/lib/auth-redirect'

describe('getRedirectPath', () => {
  it('redirects to /login when no user on protected route', () => {
    expect(getRedirectPath('/', undefined, undefined)).toBe('/login')
    expect(getRedirectPath('/leaderboard', undefined, undefined)).toBe('/login')
    expect(getRedirectPath('/record', undefined, undefined)).toBe('/login')
  })

  it('does not redirect for public routes without user', () => {
    expect(getRedirectPath('/login', undefined, undefined)).toBeNull()
    expect(getRedirectPath('/auth/callback', undefined, undefined)).toBeNull()
  })

  it('redirects to /link-member when user has no memberId', () => {
    expect(getRedirectPath('/', 'user-123', undefined)).toBe('/link-member')
    expect(getRedirectPath('/record', 'user-123', undefined)).toBe('/link-member')
  })

  it('does not redirect /link-member itself when user has no memberId', () => {
    expect(getRedirectPath('/link-member', 'user-123', undefined)).toBeNull()
  })

  it('does not redirect when user has memberId', () => {
    expect(getRedirectPath('/', 'user-123', 'member-456')).toBeNull()
    expect(getRedirectPath('/record', 'user-123', 'member-456')).toBeNull()
    expect(getRedirectPath('/leaderboard', 'user-123', 'member-456')).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd /Users/duvis/DuvisProject/newDailyMindfulRunningApp && npx vitest run tests/unit/lib/auth-redirect.test.ts 2>&1
```

Expected: FAIL — `Cannot find module '@/lib/auth-redirect'`

- [ ] **Step 3: 헬퍼 구현**

```typescript
// src/lib/auth-redirect.ts
const PUBLIC_PREFIXES = ['/login', '/auth/']

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function getRedirectPath(
  pathname: string,
  userId: string | undefined,
  memberId: string | undefined,
): string | null {
  if (isPublic(pathname)) return null
  if (!userId) return '/login'
  if (!memberId && !pathname.startsWith('/link-member')) return '/link-member'
  return null
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/lib/auth-redirect.test.ts 2>&1
```

Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-redirect.ts tests/unit/lib/auth-redirect.test.ts
git commit -m "feat: add auth-redirect helper with tests"
```

---

## Task 3: Middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: middleware.ts 구현**

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getRedirectPath } from '@/lib/auth-redirect'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const userId = user?.id
  const memberId = user?.user_metadata?.member_id as string | undefined

  const redirectTo = getRedirectPath(pathname, userId, memberId)
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-512\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware with route protection"
```

---

## Task 4: /login 페이지

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/presentation/components/auth/login-form.tsx`

- [ ] **Step 1: LoginForm 클라이언트 컴포넌트 구현**

```tsx
// src/presentation/components/auth/login-form.tsx
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
```

- [ ] **Step 2: login/page.tsx Server wrapper 생성**

```tsx
// src/app/login/page.tsx
import { LoginForm } from '@/presentation/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return <LoginForm error={error} />
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/presentation/components/auth/login-form.tsx
git commit -m "feat: add login page with gradient animation and auth buttons"
```

---

## Task 5: /auth/callback 라우트

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: callback 라우트 구현**

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/login?error=expired', origin))
    }
  }

  return NextResponse.redirect(new URL('/', origin))
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat: add auth callback route for OAuth and Magic Link"
```

---

## Task 6: /api/auth/link-member 라우트 + 단위 테스트

**Files:**
- Create: `src/app/api/auth/link-member/route.ts`
- Create: `tests/unit/api/link-member.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/unit/api/link-member.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    })),
  }),
}))

const { POST } = await import('@/app/api/auth/link-member/route')

describe('POST /api/auth/link-member', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost/api/auth/link-member', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'm1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 409 when member is already linked to another account', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } })
    mockSingle.mockResolvedValue({ data: { auth_user_id: 'user-1' }, error: null })
    const req = new Request('http://localhost/api/auth/link-member', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'm1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 200 and updates member on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { auth_user_id: null }, error: null })
    mockEq.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockEq.mockResolvedValueOnce({ error: null })
    mockUpdateUser.mockResolvedValue({ error: null })
    const req = new Request('http://localhost/api/auth/link-member', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'm1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/api/link-member.test.ts 2>&1
```

Expected: FAIL — `Cannot find module '@/app/api/auth/link-member/route'`

- [ ] **Step 3: link-member API 구현**

```typescript
// src/app/api/auth/link-member/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await req.json() as { memberId: string }

  // 이미 연결된 멤버인지 확인
  const { data: existing } = await supabase
    .from('members')
    .select('auth_user_id')
    .eq('id', memberId)
    .single()

  if (existing?.auth_user_id && existing.auth_user_id !== user.id) {
    return NextResponse.json(
      { error: '이미 다른 계정에서 사용 중인 이름입니다' },
      { status: 409 }
    )
  }

  // members 테이블 업데이트
  const { error: dbError } = await supabase
    .from('members')
    .update({ auth_user_id: user.id })
    .eq('id', memberId)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // user_metadata 업데이트 (middleware에서 DB 쿼리 없이 사용)
  const { error: metaError } = await supabase.auth.updateUser({
    data: { member_id: memberId },
  })

  if (metaError) return NextResponse.json({ error: metaError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/api/link-member.test.ts 2>&1
```

Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/link-member/route.ts tests/unit/api/link-member.test.ts
git commit -m "feat: add link-member API route with unit tests"
```

---

## Task 7: /link-member 페이지

**Files:**
- Create: `src/app/link-member/page.tsx`
- Create: `src/presentation/components/auth/link-member-form.tsx`

- [ ] **Step 1: LinkMemberForm 클라이언트 컴포넌트 구현**

```tsx
// src/presentation/components/auth/link-member-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Member } from '@/domain/entities/member'

type Props = {
  members: Member[]
}

export function LinkMemberForm({ members }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) { setError('이름을 선택해주세요'); return }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/link-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? '연결 실패')
      }
      router.push('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '연결 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F4F5F6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>
            Mindful Running
          </div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '1.4rem', fontWeight: 800, color: '#2d3031' }}>
            반갑습니다 👋
          </div>
          <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '8px' }}>
            어떤 멤버세요? 이름을 선택해주세요
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(m.id)}
                style={{
                  padding: '16px 18px', borderRadius: '16px', border: 'none',
                  background: selectedId === m.id ? '#2d3031' : '#fff',
                  color: selectedId === m.id ? '#fff' : '#2d3031',
                  fontFamily: 'var(--font-raleway)', fontSize: '0.92rem', fontWeight: 700,
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s',
                }}
              >
                {m.name}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedId}
            style={{
              width: '100%', padding: '16px', border: 'none', borderRadius: '16px',
              background: !selectedId || submitting ? '#ccc' : '#2E91FC',
              color: '#fff', fontFamily: 'var(--font-raleway)', fontSize: '0.9rem', fontWeight: 700,
              cursor: !selectedId || submitting ? 'not-allowed' : 'pointer',
              boxShadow: selectedId ? '0 6px 20px rgba(46,145,252,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? '연결 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: link-member/page.tsx Server 컴포넌트 생성**

```tsx
// src/app/link-member/page.tsx
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { LinkMemberForm } from '@/presentation/components/auth/link-member-form'

export default async function LinkMemberPage() {
  const supabase = await createServerClient()
  const repo = new SupabaseMemberRepository(supabase)

  // auth_user_id가 없는 멤버만 선택 가능
  const { data } = await supabase
    .from('members')
    .select('id, name, group_name, generation, insta_id')
    .is('auth_user_id', null)
    .order('name')

  const members = (data ?? []).map((row: { id: string; name: string; group_name: string; generation: string; insta_id: string }) => ({
    id: row.id,
    name: row.name,
    groupName: row.group_name,
    generation: row.generation,
    instaId: row.insta_id,
  }))

  return <LinkMemberForm members={members} />
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 4: Commit**

```bash
git add src/app/link-member/page.tsx src/presentation/components/auth/link-member-form.tsx
git commit -m "feat: add link-member page for first-login member selection"
```

---

## Task 8: PUT/DELETE /api/record/[id] + 단위 테스트

**Files:**
- Create: `src/app/api/record/[id]/route.ts`
- Create: `tests/unit/api/record-id.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/unit/api/record-id.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockFromSelect = vi.fn()
const mockFromUpdate = vi.fn()
const mockFromDelete = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

const mockFrom = vi.fn((table: string) => ({
  select: mockFromSelect.mockReturnThis(),
  update: mockFromUpdate.mockReturnThis(),
  delete: mockFromDelete.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
}))

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const { DELETE, PUT } = await import('@/app/api/record/[id]/route')

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('DELETE /api/record/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost/api/record/r1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('r1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when deleting another member\'s record', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } } })
    mockSingle.mockResolvedValue({ data: { member_id: 'm2' }, error: null })
    const req = new Request('http://localhost/api/record/r1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('r1'))
    expect(res.status).toBe(403)
  })

  it('returns 204 when deleting own record', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } } })
    mockSingle.mockResolvedValue({ data: { member_id: 'm1' }, error: null })
    mockEq.mockResolvedValueOnce({ error: null })
    const req = new Request('http://localhost/api/record/r1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('r1'))
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/api/record-id.test.ts 2>&1
```

Expected: FAIL — `Cannot find module '@/app/api/record/[id]/route'`

- [ ] **Step 3: PUT/DELETE 라우트 구현**

```typescript
// src/app/api/record/[id]/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import type { RunLogInput } from '@/domain/entities/run-log-input'

const SELECT_FIELDS = `
  id, member_id, date, duration_min,
  title, thought_before, thought_during, thought_after,
  location, photo_url, created_at,
  members!inner(name)
`

async function getAuthMemberId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (user.user_metadata?.member_id as string | undefined) ?? null
}

async function verifyOwnership(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  recordId: string,
  memberId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('run_logs')
    .select('member_id')
    .eq('id', recordId)
    .single()
  return data?.member_id === memberId
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const memberId = await getAuthMemberId(supabase)
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isOwner = await verifyOwnership(supabase, id, memberId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('run_logs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const memberId = await getAuthMemberId(supabase)
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isOwner = await verifyOwnership(supabase, id, memberId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as RunLogInput
  const { data, error } = await supabase
    .from('run_logs')
    .update({
      date: body.date,
      duration_min: body.durationMin,
      title: body.title,
      thought_before: body.thoughtBefore,
      thought_during: body.thoughtDuring,
      thought_after: body.thoughtAfter,
      location: body.location,
      photo_url: body.photoUrl,
    })
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/api/record-id.test.ts 2>&1
```

Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/record/[id]/route.ts tests/unit/api/record-id.test.ts
git commit -m "feat: add PUT/DELETE /api/record/[id] with ownership check"
```

---

## Task 9: RunLogForm 업데이트 (멤버 드롭다운 제거 + 수정 모드)

**Files:**
- Modify: `src/presentation/components/form/run-log-form.tsx`

- [ ] **Step 1: RunLogForm 전체 교체**

기존 파일을 아래로 완전 교체:

```tsx
// src/presentation/components/form/run-log-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DurationPicker } from './duration-picker'
import { ThoughtInputs } from './thought-inputs'
import { PhotoUpload } from './photo-upload'
import { createBrowserClient } from '@/infrastructure/supabase/browser-client'

type ThoughtKey = 'before' | 'during' | 'after'

type RunLogFormInitial = {
  date: string
  durationMin: number
  title: string
  location: string
  thoughtBefore: string
  thoughtDuring: string
  thoughtAfter: string
  photoUrl: string
}

type Props = {
  memberId: string
  mode?: 'create' | 'edit'
  recordId?: string
  initialData?: RunLogFormInitial
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-raleway)', fontSize: '0.6rem', fontWeight: 700,
  color: '#888', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: '10px',
}

const SECTION_STYLE: React.CSSProperties = { padding: '0 22px 18px' }

const TEXT_INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: '#fff', border: 'none', borderRadius: '16px',
  padding: '16px 18px', fontFamily: 'var(--font-roboto)', fontSize: '0.92rem',
  color: '#2d3031', outline: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  boxSizing: 'border-box',
}

export function RunLogForm({ memberId, mode = 'create', recordId, initialData }: Props) {
  const router = useRouter()
  const [date, setDate]                   = useState(() => initialData?.date ?? new Date().toISOString().split('T')[0]!)
  const [durationMin, setDurationMin]     = useState(initialData?.durationMin ?? 30)
  const [title, setTitle]                 = useState(initialData?.title ?? '')
  const [location, setLocation]           = useState(initialData?.location ?? '')
  const [thoughtBefore, setThoughtBefore] = useState(initialData?.thoughtBefore ?? '')
  const [thoughtDuring, setThoughtDuring] = useState(initialData?.thoughtDuring ?? '')
  const [thoughtAfter, setThoughtAfter]   = useState(initialData?.thoughtAfter ?? '')
  const [photoFile, setPhotoFile]         = useState<File | null>(null)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')

  function handleThoughtChange(key: ThoughtKey, value: string) {
    if (key === 'before') setThoughtBefore(value)
    else if (key === 'during') setThoughtDuring(value)
    else setThoughtAfter(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      let photoUrl = initialData?.photoUrl ?? ''
      if (photoFile) {
        const supabase = createBrowserClient()
        const ext = photoFile.name.split('.').pop() ?? 'jpg'
        const path = `${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('run-photos')
          .upload(path, photoFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`)
        const { data: urlData } = supabase.storage.from('run-photos').getPublicUrl(uploadData.path)
        photoUrl = urlData.publicUrl
      }

      const payload = { memberId, date, durationMin, title, thoughtBefore, thoughtDuring, thoughtAfter, location, photoUrl }

      const url    = mode === 'edit' ? `/api/record/${recordId}` : '/api/record'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? '저장 실패')
      }
      router.push('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ paddingBottom: '40px' }}>

      {/* 날짜 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>날짜</div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.57rem', fontWeight: 500, color: '#888', marginBottom: '3px' }}>날짜</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.92rem', fontWeight: 700, color: '#2d3031', border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
          />
        </div>
      </div>

      {/* 달린 시간 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>달린 시간</div>
        <DurationPicker value={durationMin} onChange={setDurationMin} />
      </div>

      {/* 장소 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>장소</div>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="어디서 달리셨나요?"
          style={TEXT_INPUT_STYLE}
        />
      </div>

      {/* 오늘의 한 줄 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>오늘의 한 줄</div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value.slice(0, 40))}
          placeholder="달리기를 한 줄로 표현한다면?"
          style={{ ...TEXT_INPUT_STYLE, fontFamily: 'var(--font-raleway)', fontWeight: 700 }}
        />
        <div style={{ textAlign: 'right', fontSize: '0.62rem', color: '#888', padding: '4px 4px 0' }}>
          {title.length} / 40
        </div>
      </div>

      {/* 달리기 전·중·후 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>달리기 전 · 중 · 후</div>
        <ThoughtInputs
          before={thoughtBefore}
          during={thoughtDuring}
          after={thoughtAfter}
          onChange={handleThoughtChange}
        />
      </div>

      {/* 사진 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>사진 (선택)</div>
        <PhotoUpload file={photoFile} onChange={setPhotoFile} />
      </div>

      {error && (
        <div style={{ padding: '0 22px 10px', color: '#ef4444', fontSize: '0.8rem' }}>{error}</div>
      )}

      <div style={{ padding: '0 22px' }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', padding: '16px',
            background: submitting ? '#888' : '#2d3031',
            border: 'none', borderRadius: '16px',
            fontFamily: 'var(--font-raleway)', fontSize: '0.9rem', fontWeight: 700,
            color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 6px 20px rgba(45,48,49,0.2)',
          }}
        >
          {submitting ? '저장 중...' : mode === 'edit' ? '수정 완료' : '기록 저장하기'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/form/run-log-form.tsx
git commit -m "feat: update RunLogForm — remove dropdown, add edit mode"
```

---

## Task 10: /record 페이지 업데이트

**Files:**
- Modify: `src/app/record/page.tsx`

- [ ] **Step 1: record/page.tsx 전체 교체**

```tsx
// src/app/record/page.tsx
import { createServerClient } from '@/infrastructure/supabase/client'
import { RunLogForm } from '@/presentation/components/form/run-log-form'
import Link from 'next/link'

type RunLogFormInitial = {
  date: string; durationMin: number; title: string; location: string
  thoughtBefore: string; thoughtDuring: string; thoughtAfter: string; photoUrl: string
}

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''

  let initialData: RunLogFormInitial | undefined
  if (edit) {
    const { data } = await supabase
      .from('run_logs')
      .select('date, duration_min, title, location, thought_before, thought_during, thought_after, photo_url')
      .eq('id', edit)
      .single()
    if (data) {
      initialData = {
        date: data.date as string,
        durationMin: data.duration_min as number,
        title: data.title as string,
        location: data.location as string,
        thoughtBefore: data.thought_before as string,
        thoughtDuring: data.thought_during as string,
        thoughtAfter: data.thought_after as string,
        photoUrl: data.photo_url as string,
      }
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F4F5F6' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 22px 20px',
      }}>
        <Link
          href="/"
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
            textDecoration: 'none', color: '#2d3031',
          }}
        >←</Link>
        <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '1rem', fontWeight: 700, color: '#2d3031' }}>
          {edit ? '기록 수정하기' : '달리기 기록하기'}
        </div>
        <div style={{ width: '36px' }} />
      </div>
      <RunLogForm
        memberId={memberId}
        mode={edit ? 'edit' : 'create'}
        recordId={edit}
        initialData={initialData}
      />
    </main>
  )
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/record/page.tsx
git commit -m "feat: update record page — use session memberId, support edit mode"
```

---

## Task 11: MyRecordCard + MyRecordsTab 컴포넌트

**Files:**
- Create: `src/presentation/components/my-records/my-record-card.tsx`
- Create: `src/presentation/components/my-records/my-records-tab.tsx`
- Create: `tests/unit/components/my-records-tab.test.tsx`

- [ ] **Step 1: MyRecordCard 구현**

```tsx
// src/presentation/components/my-records/my-record-card.tsx
'use client'

import { useState } from 'react'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  run: RunLog
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

export function MyRecordCard({ run, deleting, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      style={{
        margin: '0 22px 8px', background: '#fff', borderRadius: '16px',
        padding: '16px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        opacity: deleting ? 0.5 : 1, transition: 'opacity 0.2s', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '4px' }}>
            {formatDate(run.date)} · {run.location || '장소 미입력'} · {run.durationMin}분
          </div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.88rem', fontWeight: 700, color: '#2d3031' }}>
            {run.title || '제목 없음'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.1rem', color: '#ccc', padding: '0 0 0 12px', lineHeight: 1,
            letterSpacing: '2px',
          }}
        >
          ···
        </button>
      </div>

      {menuOpen && (
        <div
          style={{
            position: 'absolute', top: '44px', right: '16px', zIndex: 10,
            background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            overflow: 'hidden', minWidth: '100px',
          }}
        >
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onEdit() }}
            style={{ display: 'block', width: '100%', padding: '12px 18px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.82rem', color: '#2d3031', cursor: 'pointer' }}
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onDelete() }}
            style={{ display: 'block', width: '100%', padding: '12px 18px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.82rem', color: '#ef4444', cursor: 'pointer' }}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 실패하는 MyRecordsTab 테스트 작성**

```tsx
// tests/unit/components/my-records-tab.test.tsx
import { render, screen } from '@testing-library/react'
import { MyRecordsTab } from '@/presentation/components/my-records/my-records-tab'
import type { RunLog } from '@/domain/entities/run-log'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const makeRun = (overrides: Partial<RunLog> = {}): RunLog => ({
  id: 'r1', memberId: 'm1', memberName: '이두승',
  date: '2026-05-26', durationMin: 45, title: '남산',
  thoughtBefore: '', thoughtDuring: '', thoughtAfter: '',
  location: '남산', photoUrl: '', createdAt: '2026-05-26T00:00:00Z',
  ...overrides,
})

describe('MyRecordsTab', () => {
  it('shows stats card with monthly count and total hours', () => {
    const runs = [
      makeRun({ id: 'r1', durationMin: 60, date: '2026-05-20' }),
      makeRun({ id: 'r2', durationMin: 90, date: '2026-05-25' }),
    ]
    render(<MyRecordsTab runs={runs} memberId="m1" />)
    expect(screen.getByText('2')).toBeInTheDocument()  // 이번달 2회
    expect(screen.getByText('2')).toBeInTheDocument()  // 2h 30m
  })

  it('shows empty state when no runs', () => {
    render(<MyRecordsTab runs={[]} memberId="m1" />)
    expect(screen.getByText('아직 기록이 없습니다')).toBeInTheDocument()
  })

  it('renders a card for each run', () => {
    const runs = [makeRun({ id: 'r1', title: '아침 달리기' }), makeRun({ id: 'r2', title: '저녁 달리기' })]
    render(<MyRecordsTab runs={runs} memberId="m1" />)
    expect(screen.getByText('아침 달리기')).toBeInTheDocument()
    expect(screen.getByText('저녁 달리기')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/my-records-tab.test.tsx 2>&1
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 4: MyRecordsTab 구현**

```tsx
// src/presentation/components/my-records/my-records-tab.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MyRecordCard } from './my-record-card'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  runs: RunLog[]
  memberId: string
}

function computeStats(runs: RunLog[]) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyCount = runs.filter(r => r.date.startsWith(month)).length
  const totalMinutes = runs.reduce((sum, r) => sum + r.durationMin, 0)
  const totalHours   = Math.floor(totalMinutes / 60)
  const remainMin    = totalMinutes % 60
  return { monthlyCount, totalHours, remainMin }
}

export function MyRecordsTab({ runs, memberId }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const stats = computeStats(runs)

  async function handleDelete(id: string) {
    if (!confirm('이 기록을 삭제할까요?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/record/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* 통계 요약 카드 */}
      <div style={{
        margin: '0 22px 16px', background: '#2d3031', borderRadius: '20px',
        padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.58rem', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            이번달
          </div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {stats.monthlyCount}
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888', marginLeft: '4px' }}>회</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.58rem', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            누적 시간
          </div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {stats.totalHours}
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888', marginLeft: '2px' }}>h</span>
            {stats.remainMin > 0 && (
              <span style={{ fontSize: '1.1rem', fontWeight: 400, color: '#888', marginLeft: '4px' }}>{stats.remainMin}m</span>
            )}
          </div>
        </div>
      </div>

      {/* 기록 목록 */}
      {runs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '0.875rem' }}>
          아직 기록이 없습니다
        </p>
      ) : (
        runs.map(run => (
          <MyRecordCard
            key={run.id}
            run={run}
            deleting={deleting === run.id}
            onEdit={() => router.push(`/record?edit=${run.id}`)}
            onDelete={() => handleDelete(run.id)}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/my-records-tab.test.tsx 2>&1
```

Expected: PASS (3/3)

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/my-records/ tests/unit/components/my-records-tab.test.tsx
git commit -m "feat: add MyRecordCard and MyRecordsTab components"
```

---

## Task 12: HomeFeed 탭 컴포넌트 + 홈 페이지 업데이트

**Files:**
- Create: `src/presentation/components/home/home-feed.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: HomeFeed 클라이언트 컴포넌트 구현**

```tsx
// src/presentation/components/home/home-feed.tsx
'use client'

import { useState } from 'react'
import { RunFeed } from '../feed/run-feed'
import { MyRecordsTab } from '../my-records/my-records-tab'
import type { RunLog } from '@/domain/entities/run-log'

type Tab = 'all' | 'mine'

type Props = {
  recentRuns: RunLog[]
  myRuns: RunLog[]
  memberId: string
}

export function HomeFeed({ recentRuns, myRuns, memberId }: Props) {
  const [tab, setTab] = useState<Tab>('all')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체 피드' },
    { key: 'mine', label: '내 기록' },
  ]

  return (
    <>
      <div style={{
        display: 'flex', margin: '0 22px 16px',
        background: '#ffffff', borderRadius: '12px', padding: '4px',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, textAlign: 'center', padding: '8px',
              fontFamily: 'var(--font-raleway)', fontSize: '0.7rem', fontWeight: 700,
              color: tab === t.key ? '#fff' : '#888',
              background: tab === t.key ? '#2d3031' : 'transparent',
              borderRadius: '9px', border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' ? (
        <RunFeed runs={recentRuns} />
      ) : (
        <MyRecordsTab runs={myRuns} memberId={memberId} />
      )}
    </>
  )
}
```

- [ ] **Step 2: 홈 페이지 전체 교체**

```tsx
// src/app/page.tsx
import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import { HomeFeed } from '@/presentation/components/home/home-feed'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''

  const repo = new SupabaseRunLogRepository(supabase)
  const recentRuns = await new GetRecentRunsUseCase(repo).execute(7)
  const myRuns     = memberId ? await new GetMemberRecordsUseCase(repo).execute(memberId) : []

  return (
    <main style={{ minHeight: '100vh', background: '#F4F5F6', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 22px 0' }}>
        <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.68rem', fontWeight: 700, color: '#888', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Mindful Running
        </div>
        <Link
          href="/leaderboard"
          style={{ fontSize: '0.72rem', fontWeight: 500, color: '#2E91FC', textDecoration: 'none' }}
        >
          리더보드
        </Link>
      </div>

      <div style={{ padding: '18px 22px 20px' }}>
        <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '4px' }}>
          최근 7일 달리기 기록 · {recentRuns.length}건
        </div>
        <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '1.8rem', fontWeight: 800, color: '#2d3031', lineHeight: 1.15, letterSpacing: '-0.3px' }}>
          오늘도<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#2E91FC' }}>달려볼까요</em>
        </div>
      </div>

      <HomeFeed recentRuns={recentRuns} myRuns={myRuns} memberId={memberId} />

      <Link
        href="/record"
        style={{
          position: 'fixed', bottom: '28px', right: '20px',
          width: '50px', height: '50px', borderRadius: '50%',
          background: '#2E91FC', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', textDecoration: 'none',
          boxShadow: '0 6px 20px rgba(46,145,252,0.4)',
          zIndex: 101,
        }}
      >+</Link>
    </main>
  )
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1
```

Expected: 출력 없음

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/home/home-feed.tsx src/app/page.tsx
git commit -m "feat: add home feed tabs (전체 피드 / 내 기록)"
```

---

## Task 13: 전체 테스트 실행

- [ ] **Step 1: 전체 단위 테스트 실행**

```bash
cd /Users/duvis/DuvisProject/newDailyMindfulRunningApp && npx vitest run 2>&1
```

Expected: 모든 테스트 PASS

- [ ] **Step 2: 실패한 테스트 있으면 수정 후 재실행**

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "feat: complete auth system implementation (sub-project 2)"
```

---

## Self-Review

**Spec coverage:**
- ✅ 전체 앱 로그인 필수 (middleware.ts)
- ✅ 카카오 OAuth (LoginForm — signInWithOAuth)
- ✅ 이메일 Magic Link (LoginForm — signInWithOtp)
- ✅ /auth/callback 세션 교환
- ✅ 첫 로그인 /link-member 멤버 연결
- ✅ members.auth_user_id + user_metadata.member_id 동시 저장
- ✅ Magic Link 만료 에러 처리 (/login?error=expired)
- ✅ 이미 연결된 멤버 409 응답
- ✅ PUT/DELETE 본인 기록 확인 (403 Forbidden)
- ✅ 홈 "전체 피드 / 내 기록" 탭
- ✅ 내 기록: 통계(이번달 횟수 + 누적 시간) + 목록 + 수정/삭제
- ✅ /record 멤버 드롭다운 제거, 세션에서 memberId
- ✅ /record?edit=[id] 수정 모드 pre-fill

**타입 일관성:**
- `RunLogFormInitial` 타입이 Task 9(RunLogForm)와 Task 10(record/page.tsx) 양쪽에 동일하게 정의됨
- `getRedirectPath(pathname, userId, memberId)` — Task 2에서 정의, Task 3 middleware에서 사용
- `HomeFeed` props의 `myRuns: RunLog[]` — Task 12에서 정의, 홈 페이지에서 동일 타입으로 전달
