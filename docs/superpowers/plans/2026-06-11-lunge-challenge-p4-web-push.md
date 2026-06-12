# 100일 런지 챌린지 P4 — Web Push (PWA OS 푸시)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA Web Push 으로 매일 KST 20:00 미달성 사용자에게 OS 알림. VAPID + Service Worker + push_subscriptions + Edge Function (mission-reminder).

**Architecture:** 클라이언트가 `Notification.requestPermission()` + `PushManager.subscribe(VAPID_PUBLIC_KEY)` → 결과를 `POST /api/push/subscribe` 로 저장 → Edge Function (cron) 이 매일 20:00 KST 미달성자 구독을 조회 → `web-push` (Deno) 로 발송.

**Tech Stack:** Web Push API, VAPID, `web-push` npm/deno, Service Worker.

**관련 스펙:** [docs/superpowers/specs/2026-06-11-lunge-challenge-design.md](../specs/2026-06-11-lunge-challenge-design.md)
**의존:** P1 (auth + members), P2 (미션 페이지 — 가이드 시트 삽입).

**P4 범위 (10 태스크):**
1. push_subscriptions 테이블 마이그레이션 + RLS
2. IPushSubscriptionRepository 인터페이스
3. SupabasePushSubscriptionRepository + integration test
4. SubscribePushUseCase + UnsubscribePushUseCase + unit test
5. API POST /api/push/subscribe + POST /api/push/unsubscribe + tests
6. VAPID key 생성 스크립트 + .env 변수 + README
7. Service Worker `public/sw.js`
8. usePushSubscribe 클라이언트 hook + MissionPageClient 통합
9. iOSInstallGuideSheet 컴포넌트 + 트리거 로직
10. Edge Function `mission-reminder` + pg_cron 스케줄

**P4 범위 밖:**
- 카카오톡 알림톡 폴백 (V2)
- 알림 클릭 후 deep link 라우팅 정교화 (단순 /mission 이동만 P4 범위)

---

## Task 1: push_subscriptions 테이블 마이그레이션

**Files:**
- Create: `supabase/migrations/20260615_push_subscriptions.sql`

- [ ] **Step 1.1: 마이그레이션 작성**

`supabase/migrations/20260615_push_subscriptions.sql`:

```sql
CREATE TABLE push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_member ON push_subscriptions (member_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL USING (
    member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
  );
```

- [ ] **Step 1.2: Dashboard SQL Editor 적용 (너 액션)**

- [ ] **Step 1.3: 커밋**

```bash
git add supabase/migrations/20260615_push_subscriptions.sql
git commit -m "feat(db): add push_subscriptions table with RLS"
```

---

## Task 2: IPushSubscriptionRepository 인터페이스

**Files:**
- Create: `src/domain/entities/push-subscription.ts`
- Create: `src/domain/repositories/push-subscription-repository.ts`

- [ ] **Step 2.1: entity**

`src/domain/entities/push-subscription.ts`:

```typescript
export type PushSubscriptionEntity = {
  id: string
  memberId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: string
}
```

- [ ] **Step 2.2: repo 인터페이스**

`src/domain/repositories/push-subscription-repository.ts`:

```typescript
import type { PushSubscriptionEntity } from '@/domain/entities/push-subscription'

export type SaveSubscriptionInput = {
  memberId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

export interface IPushSubscriptionRepository {
  save(input: SaveSubscriptionInput): Promise<PushSubscriptionEntity>
  deleteByEndpoint(memberId: string, endpoint: string): Promise<void>
  listByMember(memberId: string): Promise<PushSubscriptionEntity[]>
}
```

- [ ] **Step 2.3: tsc + 커밋**

```bash
npx tsc --noEmit
git add src/domain/entities/push-subscription.ts src/domain/repositories/push-subscription-repository.ts
git commit -m "feat(domain): add PushSubscription entity + repo interface"
```

---

## Task 3: SupabasePushSubscriptionRepository + integration test

**Files:**
- Create: `src/infrastructure/supabase/push-subscription-repository.ts`
- Test: `tests/integration/supabase/push-subscription-repository.test.ts`

- [ ] **Step 3.1: 실패하는 통합 테스트**

`tests/integration/supabase/push-subscription-repository.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabasePushSubscriptionRepository } from '@/infrastructure/supabase/push-subscription-repository'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

describe('SupabasePushSubscriptionRepository (integration)', () => {
  it('listByMember returns array', async () => {
    const repo = new SupabasePushSubscriptionRepository(supabase)
    const list = await repo.listByMember('00000000-0000-0000-0000-000000000000')
    expect(Array.isArray(list)).toBe(true)
  })
})
```

- [ ] **Step 3.2: 실패 확인**

```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/push-subscription-repository.test.ts
```

- [ ] **Step 3.3: 구현**

`src/infrastructure/supabase/push-subscription-repository.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  IPushSubscriptionRepository,
  SaveSubscriptionInput,
} from '@/domain/repositories/push-subscription-repository'
import type { PushSubscriptionEntity } from '@/domain/entities/push-subscription'

type Row = {
  id: string
  member_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
}

function toEntity(row: Row): PushSubscriptionEntity {
  return {
    id: row.id,
    memberId: row.member_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }
}

const SELECT = 'id, member_id, endpoint, p256dh, auth, user_agent, created_at'

export class SupabasePushSubscriptionRepository implements IPushSubscriptionRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(input: SaveSubscriptionInput): Promise<PushSubscriptionEntity> {
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .upsert(
        {
          member_id: input.memberId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.userAgent ?? null,
        },
        { onConflict: 'member_id,endpoint', ignoreDuplicates: false }
      )
      .select(SELECT)
      .single()
    if (error) throw new Error(`save failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }

  async deleteByEndpoint(memberId: string, endpoint: string): Promise<void> {
    const { error } = await this.supabase
      .from('push_subscriptions')
      .delete()
      .eq('member_id', memberId)
      .eq('endpoint', endpoint)
    if (error) throw new Error(`deleteByEndpoint failed: ${error.message}`)
  }

  async listByMember(memberId: string): Promise<PushSubscriptionEntity[]> {
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .select(SELECT)
      .eq('member_id', memberId)
    if (error) throw new Error(`listByMember failed: ${error.message}`)
    return (data as unknown as Row[]).map(toEntity)
  }
}
```

- [ ] **Step 3.4: 테스트 통과 + 커밋**

```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/push-subscription-repository.test.ts
git add src/infrastructure/supabase/push-subscription-repository.ts tests/integration/supabase/push-subscription-repository.test.ts
git commit -m "feat(infra): add SupabasePushSubscriptionRepository"
```

---

## Task 4: SubscribePush + UnsubscribePush use cases

**Files:**
- Create: `src/application/use-cases/subscribe-push.ts`
- Create: `src/application/use-cases/unsubscribe-push.ts`
- Test: `tests/unit/use-cases/subscribe-push.test.ts`

- [ ] **Step 4.1: 실패하는 test**

`tests/unit/use-cases/subscribe-push.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { SubscribePushUseCase } from '@/application/use-cases/subscribe-push'
import { UnsubscribePushUseCase } from '@/application/use-cases/unsubscribe-push'
import type { IPushSubscriptionRepository } from '@/domain/repositories/push-subscription-repository'

describe('SubscribePushUseCase', () => {
  it('saves subscription', async () => {
    const repo = {
      save: vi.fn().mockResolvedValue({ id: 's1' }),
      deleteByEndpoint: vi.fn(),
      listByMember: vi.fn(),
    } as IPushSubscriptionRepository
    const uc = new SubscribePushUseCase(repo)
    const r = await uc.execute({
      memberId: 'm1',
      endpoint: 'https://push.example/abc',
      p256dh: 'pk',
      auth: 'auth',
    })
    expect(r.id).toBe('s1')
    expect(repo.save).toHaveBeenCalled()
  })
})

describe('UnsubscribePushUseCase', () => {
  it('deletes by endpoint', async () => {
    const repo = {
      save: vi.fn(),
      deleteByEndpoint: vi.fn(),
      listByMember: vi.fn(),
    } as IPushSubscriptionRepository
    const uc = new UnsubscribePushUseCase(repo)
    await uc.execute({ memberId: 'm1', endpoint: 'https://push.example/abc' })
    expect(repo.deleteByEndpoint).toHaveBeenCalledWith('m1', 'https://push.example/abc')
  })
})
```

- [ ] **Step 4.2: 실패 확인**

```bash
npx vitest run tests/unit/use-cases/subscribe-push.test.ts
```

- [ ] **Step 4.3: 구현 2개**

`src/application/use-cases/subscribe-push.ts`:

```typescript
import type { IPushSubscriptionRepository, SaveSubscriptionInput } from '@/domain/repositories/push-subscription-repository'
import type { PushSubscriptionEntity } from '@/domain/entities/push-subscription'

export class SubscribePushUseCase {
  constructor(private repo: IPushSubscriptionRepository) {}
  execute(input: SaveSubscriptionInput): Promise<PushSubscriptionEntity> {
    return this.repo.save(input)
  }
}
```

`src/application/use-cases/unsubscribe-push.ts`:

```typescript
import type { IPushSubscriptionRepository } from '@/domain/repositories/push-subscription-repository'

export class UnsubscribePushUseCase {
  constructor(private repo: IPushSubscriptionRepository) {}
  execute(input: { memberId: string; endpoint: string }): Promise<void> {
    return this.repo.deleteByEndpoint(input.memberId, input.endpoint)
  }
}
```

- [ ] **Step 4.4: 테스트 통과 + 커밋**

```bash
npx vitest run tests/unit/use-cases/subscribe-push.test.ts
git add src/application/use-cases/subscribe-push.ts src/application/use-cases/unsubscribe-push.ts tests/unit/use-cases/subscribe-push.test.ts
git commit -m "feat(use-case): add SubscribePushUseCase and UnsubscribePushUseCase"
```

---

## Task 5: API POST /api/push/subscribe + POST /api/push/unsubscribe

**Files:**
- Create: `src/app/api/push/subscribe/route.ts`
- Create: `src/app/api/push/unsubscribe/route.ts`
- Test: `tests/unit/api/push-subscribe.test.ts`

- [ ] **Step 5.1: 실패하는 테스트**

`tests/unit/api/push-subscribe.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/client', () => ({ createServerClient: vi.fn() }))
vi.mock('@/infrastructure/supabase/push-subscription-repository', () => ({
  SupabasePushSubscriptionRepository: vi.fn(),
}))

import { POST as subscribePost } from '@/app/api/push/subscribe/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabasePushSubscriptionRepository } from '@/infrastructure/supabase/push-subscription-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedRepo = vi.mocked(SupabasePushSubscriptionRepository)

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/push/subscribe', () => {
  it('returns 401 when not authenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } }),
    })
    const res = await subscribePost(req)
    expect(res.status).toBe(401)
  })

  it('returns 201 on success', async () => {
    mockedCreate.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    mockedRepo.mockImplementation(function () {
      return {
        save: vi.fn().mockResolvedValue({ id: 's1', memberId: 'm1' }),
        deleteByEndpoint: vi.fn(),
        listByMember: vi.fn(),
      } as unknown as InstanceType<typeof SupabasePushSubscriptionRepository>
    })
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push.example/abc', keys: { p256dh: 'pk', auth: 'authk' } }),
    })
    const res = await subscribePost(req)
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 5.2: 실패 확인**

```bash
npx vitest run tests/unit/api/push-subscribe.test.ts
```

- [ ] **Step 5.3: 구현**

`src/app/api/push/subscribe/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabasePushSubscriptionRepository } from '@/infrastructure/supabase/push-subscription-repository'
import { SubscribePushUseCase } from '@/application/use-cases/subscribe-push'

type Body = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
  userAgent?: string
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  let body: Body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    const repo = new SupabasePushSubscriptionRepository(supabase)
    const uc = new SubscribePushUseCase(repo)
    const result = await uc.execute({
      memberId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

`src/app/api/push/unsubscribe/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabasePushSubscriptionRepository } from '@/infrastructure/supabase/push-subscription-repository'
import { UnsubscribePushUseCase } from '@/application/use-cases/unsubscribe-push'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  let body: { endpoint?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (!body.endpoint) return NextResponse.json({ error: 'MISSING_ENDPOINT' }, { status: 400 })

  try {
    const repo = new SupabasePushSubscriptionRepository(supabase)
    const uc = new UnsubscribePushUseCase(repo)
    await uc.execute({ memberId, endpoint: body.endpoint })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 5.4: 테스트 통과 + 커밋**

```bash
npx vitest run tests/unit/api/push-subscribe.test.ts
git add src/app/api/push/subscribe/route.ts src/app/api/push/unsubscribe/route.ts tests/unit/api/push-subscribe.test.ts
git commit -m "feat(api): add push subscribe/unsubscribe routes"
```

---

## Task 6: VAPID key 생성 + .env 변수 + README

**Files:**
- Create: `scripts/generate-vapid-keys.mjs`
- Modify: `.env.local` (너 직접), `.env.example` (만약 있으면 수정)
- Create: `docs/push-setup.md`

- [ ] **Step 6.1: 생성 스크립트**

`scripts/generate-vapid-keys.mjs`:

```javascript
import webpush from 'web-push'
const keys = webpush.generateVAPIDKeys()
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
console.log('VAPID_SUBJECT=mailto:admin@example.com')
```

- [ ] **Step 6.2: web-push 설치**

```bash
npm i web-push @types/web-push
```

- [ ] **Step 6.3: VAPID 생성**

```bash
node scripts/generate-vapid-keys.mjs
```

출력된 3 라인을 `.env.local` 에 추가. Supabase Edge Function 환경 변수에도 동일하게 등록 (Dashboard → Settings → Functions → Secrets).

- [ ] **Step 6.4: README 작성**

`docs/push-setup.md`:

```markdown
# Push 알림 셋업

1. VAPID key 생성: `node scripts/generate-vapid-keys.mjs`
2. `.env.local` 에 3 라인 추가
3. Supabase Dashboard → Settings → Edge Functions → Secrets 에 동일 값 추가
4. `supabase/migrations/20260615_push_subscriptions.sql` Dashboard 적용
5. `npx supabase functions deploy mission-reminder` (Task 10 후)
6. pg_cron 스케줄 등록 (Task 10 마이그레이션)

iOS 사용자 안내: Safari 16.4+ 에서 "홈 화면에 추가" 후 푸시 권한 허용. 미설치 시 푸시 미지원 (인앱 알림만 동작).
```

- [ ] **Step 6.5: 커밋**

```bash
git add scripts/generate-vapid-keys.mjs package.json package-lock.json docs/push-setup.md
git commit -m "feat(push): VAPID key generator + setup docs + web-push dep"
```

---

## Task 7: Service Worker

**Files:**
- Create: `public/sw.js`
- Modify: `src/app/layout.tsx` (SW 등록)

- [ ] **Step 7.1: SW 작성**

`public/sw.js`:

```javascript
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  const data = (() => {
    try { return event.data?.json() ?? {} } catch { return { title: '미션 알림', body: event.data?.text() ?? '' } }
  })()
  const title = data.title || '미션 알림'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/mission' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/mission'
  event.waitUntil(self.clients.openWindow(url))
})
```

- [ ] **Step 7.2: layout.tsx — SW 등록 (클라이언트 스니펫)**

`src/app/layout.tsx` 의 RootLayout 안 하단에 추가 (또는 별도 `<SWRegistrar />` 클라이언트 컴포넌트 생성). 본 플랜은 별도 컴포넌트 권장.

`src/presentation/components/layout/sw-registrar.tsx`:

```typescript
'use client'
import { useEffect } from 'react'

export function SWRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('SW register failed', err)
    })
  }, [])
  return null
}
```

`src/app/layout.tsx` 에 `<SWRegistrar />` 추가 (RootLayout body 안).

- [ ] **Step 7.3: 커밋**

```bash
git add public/sw.js src/presentation/components/layout/sw-registrar.tsx src/app/layout.tsx
git commit -m "feat(push): add service worker + registrar"
```

---

## Task 8: usePushSubscribe hook + MissionPageClient 통합

**Files:**
- Create: `src/presentation/components/mission/use-push-subscribe.ts`
- Modify: `src/presentation/components/mission/mission-page-client.tsx`

- [ ] **Step 8.1: hook 작성**

`src/presentation/components/mission/use-push-subscribe.ts`:

```typescript
'use client'

import { useCallback, useState } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export type PushSubscribeState = 'idle' | 'unsupported' | 'denied' | 'subscribed' | 'pending' | 'error'

export function usePushSubscribe() {
  const [state, setState] = useState<PushSubscribeState>('idle')
  const [error, setError] = useState<string | null>(null)

  const subscribe = useCallback(async () => {
    setError(null)
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    setState('pending')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''),
      })

      const json = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setState('error')
        setError(err.error ?? 'unknown')
        return
      }
      setState('subscribed')
    } catch (e) {
      setState('error')
      setError(String(e))
    }
  }, [])

  return { state, error, subscribe }
}
```

- [ ] **Step 8.2: MissionPageClient 통합 (참가 직후 권한 요청)**

`mission-page-client.tsx` 내 `enroll` 함수 마지막에 `await subscribePush()` 호출. hook 사용은 컴포넌트 안. 기존 enroll 흐름 끝나면 `subscribe()` 호출.

(엔지니어 가이드: 너무 침입적이지 않게 — enroll 성공 토스트 후 약 1초 뒤 권한 prompt 호출. iOS 미설치 케이스는 Task 9 가이드 시트로 분기.)

- [ ] **Step 8.3: 커밋**

```bash
git add src/presentation/components/mission/use-push-subscribe.ts src/presentation/components/mission/mission-page-client.tsx
git commit -m "feat(push): usePushSubscribe hook + mission page integration"
```

---

## Task 9: iOSInstallGuideSheet 컴포넌트

iOS Safari + PWA 미설치 감지 → 시트 표시.

**Files:**
- Create: `src/presentation/components/mission/ios-install-guide-sheet.tsx`
- Test: `tests/unit/components/ios-install-guide-sheet.test.tsx`

- [ ] **Step 9.1: 실패하는 테스트**

`tests/unit/components/ios-install-guide-sheet.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { IOSInstallGuideSheet } from '@/presentation/components/mission/ios-install-guide-sheet'

describe('IOSInstallGuideSheet', () => {
  it('renders guide when open', () => {
    render(<IOSInstallGuideSheet open onClose={() => {}} />)
    expect(screen.getByText(/홈 화면에 추가/)).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<IOSInstallGuideSheet open={false} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 9.2: 실패 확인**

```bash
npx vitest run tests/unit/components/ios-install-guide-sheet.test.tsx
```

- [ ] **Step 9.3: 구현**

`src/presentation/components/mission/ios-install-guide-sheet.tsx`:

```typescript
'use client'

type Props = { open: boolean; onClose: () => void }

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function IOSInstallGuideSheet({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-end',
        zIndex: 1000,
        fontFamily: FONT,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: '#fff',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '28px 24px 36px',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>알림 받기 위해</h2>
        <p style={{ fontSize: 13, color: '#555', margin: '8px 0 20px', lineHeight: 1.6 }}>
          iOS Safari 는 PWA 로 설치된 앱만 푸시 알림을 받을 수 있어요.
        </p>
        <ol style={{ fontSize: 13, color: '#111', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>하단 공유 버튼 (□↑) 탭</li>
          <li>"홈 화면에 추가" 선택</li>
          <li>홈 화면 아이콘으로 앱 다시 열기</li>
          <li>알림 권한 허용</li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', marginTop: 24,
            padding: '14px 0', background: '#111', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
            fontFamily: FONT, cursor: 'pointer',
          }}
        >
          알겠어요
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 9.4: MissionPageClient 통합**

`mission-page-client.tsx` 의 enroll 흐름에서:

```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window as any).navigator.standalone
if (isIOS && !isStandalone) {
  setShowIosSheet(true)
} else {
  await subscribePush()
}
```

`setShowIosSheet` 는 useState. 시트 노출.

- [ ] **Step 9.5: 통과 + 커밋**

```bash
npx vitest run tests/unit/components/ios-install-guide-sheet.test.tsx
git add src/presentation/components/mission/ios-install-guide-sheet.tsx tests/unit/components/ios-install-guide-sheet.test.tsx src/presentation/components/mission/mission-page-client.tsx
git commit -m "feat(push): iOS PWA install guide sheet"
```

---

## Task 10: Edge Function `mission-reminder` + pg_cron 스케줄

매일 KST 20:00 미달성 사용자에게 푸시 발송.

**Files:**
- Create: `supabase/functions/mission-reminder/index.ts`
- Create: `supabase/migrations/20260616_cron_mission_reminder.sql`

- [ ] **Step 10.1: Edge Function 구현**

`supabase/functions/mission-reminder/index.ts`:

```typescript
import { createServiceRoleClient } from '../_shared/supabase-client.ts'
import { kstToday } from '../_shared/kst.ts'
import webpush from 'npm:web-push@3'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const today = kstToday()

  const { data: ch } = await supabase
    .from('challenges')
    .select('id, start_date, duration_days')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!ch) {
    return new Response(JSON.stringify({ ok: true, message: 'no active challenge' }), { status: 200 })
  }

  // active participants with today count=0
  const { data: parts } = await supabase
    .from('challenge_participations')
    .select('id, member_id, passes_remaining')
    .eq('challenge_id', ch.id)
    .is('completed_at', null)
    .is('failed_at', null)

  let sent = 0
  let failed = 0

  for (const p of (parts ?? [])) {
    const { data: log } = await supabase
      .from('mission_logs')
      .select('count')
      .eq('participation_id', p.id)
      .eq('log_date', today)
      .maybeSingle()
    const todayCount = log?.count ?? 0
    if (todayCount > 0) continue

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('member_id', p.member_id)

    for (const s of (subs ?? [])) {
      const payload = JSON.stringify({
        title: '오늘 런지 0개 🏃',
        body: `면죄권 ${p.passes_remaining}장 남음. 지금 시작!`,
        url: '/mission',
      })
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payload)
        sent++
      } catch (e) {
        failed++
        // 410 Gone = invalid subscription, delete
        if ((e as any).statusCode === 410) {
          await supabase.from('push_subscriptions').delete()
            .eq('member_id', p.member_id).eq('endpoint', s.endpoint)
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, today, sent, failed }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
})
```

- [ ] **Step 10.2: 배포**

```bash
npx supabase functions deploy mission-reminder
```

- [ ] **Step 10.3: pg_cron 스케줄**

`supabase/migrations/20260616_cron_mission_reminder.sql`:

```sql
-- mission reminder at KST 20:00 = UTC 11:00
SELECT cron.schedule(
  'mission-reminder',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/mission-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 10.4: Dashboard 적용 (너 액션)**

- [ ] **Step 10.5: 풀 단위 테스트 + tsc**

```bash
npx vitest run
npx tsc --noEmit
```

- [ ] **Step 10.6: 커밋**

```bash
git add supabase/functions/mission-reminder/index.ts supabase/migrations/20260616_cron_mission_reminder.sql
git commit -m "feat(push): mission-reminder Edge Function + KST 20:00 cron schedule"
```

---

## P4 완료 검증

- [ ] 모든 P4 마이그레이션 Dashboard 적용
- [ ] VAPID env Supabase Function Secrets 에 등록
- [ ] `mission-reminder` 배포 확인 (Dashboard → Edge Functions)
- [ ] 안드로이드 Chrome 으로 미션 페이지 → 참가 → 푸시 권한 허용 → 다음 날 KST 20:00 알림 수신
- [ ] iOS Safari → "홈 화면 추가" 가이드 시트 노출 확인

## 다음 플랜

P5 완주 인증 + 피드 Realtime

## Self-Review

- Spec coverage: Web Push 인프라 모두 (구독/발송/SW/iOS 가이드/cron). 미달성 일 알림 정책 (KST 20:00) 적용.
- Placeholder: `<PROJECT_REF>` 마이그레이션 가이드에 명시.
- iOS 한계 명시 + 폴백 (인앱 알림 종 아이콘) = 사용자 경험 일관.
- 410 Gone 처리로 stale subscription 자동 정리.
