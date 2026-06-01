# Likes & Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add heart-toggle likes and Instagram-style comment threads to running log records.

**Architecture:** New `likes` and `comments` Supabase tables store social data. `RunLog` gains `likeCount`/`commentCount` via PostgREST embedded counts. A fixed bottom action bar in `DetailSheet` hosts `LikeCommentBar`; tapping 💬 mounts `CommentsSheet` as an overlay above the detail sheet.

**Tech Stack:** Next.js App Router, Supabase (admin client for writes, server client for auth), React hooks, Vitest + Testing Library, inline styles (no CSS library).

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/domain/entities/comment.ts` |
| Modify | `src/domain/entities/run-log.ts` |
| Modify | `src/infrastructure/supabase/run-log-repository.ts` |
| Create | `src/app/api/record/[id]/like/route.ts` |
| Create | `src/app/api/record/[id]/comments/route.ts` |
| Create | `src/app/api/comments/[commentId]/route.ts` |
| Create | `src/presentation/components/feed/like-comment-bar.tsx` |
| Create | `src/presentation/components/feed/comments-sheet.tsx` |
| Modify | `src/presentation/components/feed/detail-sheet.tsx` |
| Modify | `src/presentation/components/feed/run-card.tsx` |
| Modify | `src/presentation/components/feed/run-feed.tsx` |
| Modify | `src/presentation/components/home/home-feed.tsx` |
| Modify | `src/app/home/page.tsx` |
| Modify | `tests/unit/components/run-card.test.tsx` |
| Modify | `tests/unit/components/detail-sheet.test.tsx` |
| Modify | `tests/unit/components/my-records-tab.test.tsx` |
| Create | `tests/unit/components/like-comment-bar.test.tsx` |
| Create | `tests/unit/components/comments-sheet.test.tsx` |

---

### Task 1: DB Migration

**Files:**
- Manual SQL — run in Supabase dashboard → SQL Editor

- [ ] **Step 1: Run migration SQL in Supabase dashboard**

```sql
-- likes table
CREATE TABLE likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_log_id  uuid NOT NULL REFERENCES run_logs(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_log_id, member_id)
);

-- comments table
CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_log_id  uuid NOT NULL REFERENCES run_logs(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Public read RLS (writes handled via service_role in API routes)
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_public" ON likes FOR SELECT USING (true);
CREATE POLICY "comments_select_public" ON comments FOR SELECT USING (true);
```

- [ ] **Step 2: Verify tables exist**

In Supabase dashboard → Table Editor, confirm `likes` and `comments` tables are visible with the correct columns.

- [ ] **Step 3: Commit migration file for reference**

```bash
mkdir -p supabase/migrations
cat > supabase/migrations/20260601_likes_comments.sql << 'EOF'
-- (paste the SQL above)
EOF
git add supabase/migrations/20260601_likes_comments.sql
git commit -m "db: add likes and comments tables"
```

---

### Task 2: Comment Entity + RunLog Type Update

**Files:**
- Create: `src/domain/entities/comment.ts`
- Modify: `src/domain/entities/run-log.ts`

- [ ] **Step 1: Create Comment entity**

Create `src/domain/entities/comment.ts`:

```ts
export type Comment = {
  id: string
  memberId: string
  memberName: string
  memberAvatarUrl: string
  body: string
  createdAt: string
}
```

- [ ] **Step 2: Add likeCount + commentCount to RunLog**

Modify `src/domain/entities/run-log.ts`:

```ts
export type RunLog = {
  id: string
  memberId: string
  memberName: string
  memberAvatarUrl: string
  memberInstaId: string
  date: string
  durationMin: number
  title: string
  thoughtBefore: string
  thoughtDuring: string
  thoughtAfter: string
  location: string
  photoUrl: string
  createdAt: string
  likeCount: number
  commentCount: number
}
```

- [ ] **Step 3: Fix broken test fixtures (3 files)**

In `tests/unit/components/run-card.test.tsx`, add `likeCount: 0, commentCount: 0` to the `makeRun` factory:

```ts
const makeRun = (overrides: Partial<RunLog> = {}): RunLog => ({
  id: 'r1',
  memberId: 'm1',
  memberName: '이두승', memberAvatarUrl: '', memberInstaId: '',
  date: '2026-05-24',
  durationMin: 45,
  title: '남산 달리기',
  thoughtBefore: '가볍게 달릴 예정',
  thoughtDuring: '생각보다 좋다',
  thoughtAfter: '뿌듯하다',
  location: '남산',
  photoUrl: '',
  createdAt: '2026-05-24T09:00:00Z',
  likeCount: 0,
  commentCount: 0,
  ...overrides,
})
```

In `tests/unit/components/detail-sheet.test.tsx`, add `likeCount: 0, commentCount: 0` to the `run` fixture object:

```ts
const run: RunLog = {
  id: 'r1',
  memberId: 'm1',
  memberName: '이두승', memberAvatarUrl: '', memberInstaId: '',
  date: '2026-05-24',
  durationMin: 45,
  title: '남산 달리기',
  thoughtBefore: '가볍게 달릴 예정',
  thoughtDuring: '생각보다 좋다',
  thoughtAfter: '뿌듯하다',
  location: '남산',
  photoUrl: '',
  createdAt: '2026-05-24T09:00:00Z',
  likeCount: 0,
  commentCount: 0,
}
```

In `tests/unit/components/my-records-tab.test.tsx`, add to the `makeRun` factory:

```ts
const makeRun = (overrides: Partial<RunLog> = {}): RunLog => ({
  id: 'r1', memberId: 'm1', memberName: '이두승', memberAvatarUrl: '', memberInstaId: '',
  date: '2026-05-26', durationMin: 45, title: '남산',
  thoughtBefore: '', thoughtDuring: '', thoughtAfter: '',
  location: '남산', photoUrl: '', createdAt: '2026-05-26T00:00:00Z',
  likeCount: 0,
  commentCount: 0,
  ...overrides,
})
```

- [ ] **Step 4: Run tests — expect passing**

```bash
npm test
```

Expected: all existing tests pass (TypeScript errors resolved by the new fields).

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/comment.ts src/domain/entities/run-log.ts \
  tests/unit/components/run-card.test.tsx \
  tests/unit/components/detail-sheet.test.tsx \
  tests/unit/components/my-records-tab.test.tsx
git commit -m "feat: add Comment entity and likeCount/commentCount to RunLog"
```

---

### Task 3: Repository — Embedded Count Queries

**Files:**
- Modify: `src/infrastructure/supabase/run-log-repository.ts`

- [ ] **Step 1: Update RunLogRow type and SELECT_FIELDS**

Replace the existing `RunLogRow` type and `SELECT_FIELDS` constant in `src/infrastructure/supabase/run-log-repository.ts`:

```ts
type RunLogRow = {
  id: string
  member_id: string
  date: string
  duration_min: number
  title: string
  thought_before: string
  thought_during: string
  thought_after: string
  location: string
  photo_url: string
  created_at: string
  members: { name: string; avatar_url: string | null; insta_id: string | null } | null
  likes: [{ count: number }] | null
  comments: [{ count: number }] | null
}

const SELECT_FIELDS = `
  id, member_id, date, duration_min,
  title, thought_before, thought_during, thought_after,
  location, photo_url, created_at,
  members!inner(name, avatar_url, insta_id),
  likes(count),
  comments(count)
`
```

- [ ] **Step 2: Update toRunLog mapper**

Replace the `toRunLog` function:

```ts
function toRunLog(row: RunLogRow): RunLog {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.members?.name ?? '',
    memberAvatarUrl: row.members?.avatar_url ?? '',
    memberInstaId: row.members?.insta_id ?? '',
    date: row.date,
    durationMin: row.duration_min,
    title: row.title,
    thoughtBefore: row.thought_before,
    thoughtDuring: row.thought_during,
    thoughtAfter: row.thought_after,
    location: row.location,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    likeCount: (row.likes?.[0]?.count as number) ?? 0,
    commentCount: (row.comments?.[0]?.count as number) ?? 0,
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/run-log-repository.ts
git commit -m "feat: include like/comment counts in run log queries"
```

---

### Task 4: Like API Route

**Files:**
- Create: `src/app/api/record/[id]/like/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/record/[id]/like/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

async function getAuthMemberId(): Promise<string | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (user.user_metadata?.member_id as string | undefined) ?? null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const memberId = await getAuthMemberId()
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [existingRow, { count }] = await Promise.all([
    admin.from('likes').select('id').eq('run_log_id', runLogId).eq('member_id', memberId).maybeSingle(),
    admin.from('likes').select('*', { count: 'exact', head: true }).eq('run_log_id', runLogId),
  ])

  return NextResponse.json({ liked: Boolean(existingRow.data), likeCount: count ?? 0 })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const memberId = await getAuthMemberId()
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('likes')
    .select('id')
    .eq('run_log_id', runLogId)
    .eq('member_id', memberId)
    .maybeSingle()

  if (existing) {
    await admin.from('likes').delete().eq('id', existing.id)
  } else {
    await admin.from('likes').insert({ run_log_id: runLogId, member_id: memberId })
  }

  const { count } = await admin
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('run_log_id', runLogId)

  return NextResponse.json({ liked: !existing, likeCount: count ?? 0 })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/record/\[id\]/like/route.ts
git commit -m "feat: add like toggle API route"
```

---

### Task 5: Comments API Routes

**Files:**
- Create: `src/app/api/record/[id]/comments/route.ts`
- Create: `src/app/api/comments/[commentId]/route.ts`

- [ ] **Step 1: Create comments list + create route**

Create `src/app/api/record/[id]/comments/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import type { Comment } from '@/domain/entities/comment'

type CommentRow = {
  id: string
  member_id: string
  body: string
  created_at: string
  members: { name: string; avatar_url: string | null } | null
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.members?.name ?? '',
    memberAvatarUrl: row.members?.avatar_url ?? '',
    body: row.body,
    createdAt: row.created_at,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('comments')
    .select('id, member_id, body, created_at, members(name, avatar_url)')
    .eq('run_log_id', runLogId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: (data as unknown as CommentRow[]).map(toComment) })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const memberId = (user.user_metadata?.member_id as string | undefined) ?? null
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json() as { body: string }
  if (!body || body.trim().length < 1 || body.trim().length > 500) {
    return NextResponse.json({ error: '댓글은 1자 이상 500자 이하여야 합니다' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('comments')
    .insert({ run_log_id: runLogId, member_id: memberId, body: body.trim() })
    .select('id, member_id, body, created_at, members(name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toComment(data as unknown as CommentRow), { status: 201 })
}
```

- [ ] **Step 2: Create comment delete route**

Create `src/app/api/comments/[commentId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const memberId = (user.user_metadata?.member_id as string | undefined) ?? null
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: comment } = await admin
    .from('comments')
    .select('member_id')
    .eq('id', commentId)
    .maybeSingle()

  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.member_id !== memberId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await admin.from('comments').delete().eq('id', commentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/record/[id]/comments/route.ts" "src/app/api/comments/[commentId]/route.ts"
git commit -m "feat: add comments list/create/delete API routes"
```

---

### Task 6: LikeCommentBar Component

**Files:**
- Create: `src/presentation/components/feed/like-comment-bar.tsx`
- Create: `tests/unit/components/like-comment-bar.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/unit/components/like-comment-bar.test.tsx`:

```ts
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LikeCommentBar } from '@/presentation/components/feed/like-comment-bar'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const fetchMock = vi.fn()
global.fetch = fetchMock

describe('LikeCommentBar', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ liked: false, likeCount: 5 }) })
  })

  it('shows likeCount from props immediately', () => {
    render(<LikeCommentBar runId="r1" likeCount={5} commentCount={3} memberId="m1" onCommentOpen={() => {}} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides count when zero', () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ liked: false, likeCount: 0 }) })
    render(<LikeCommentBar runId="r1" likeCount={0} commentCount={0} memberId="m1" onCommentOpen={() => {}} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('calls onCommentOpen when chat button is clicked', async () => {
    const onCommentOpen = vi.fn()
    render(<LikeCommentBar runId="r1" likeCount={0} commentCount={2} memberId="m1" onCommentOpen={onCommentOpen} />)
    await userEvent.click(screen.getByRole('button', { name: /댓글/ }))
    expect(onCommentOpen).toHaveBeenCalledOnce()
  })

  it('fetches like status on mount when memberId provided', async () => {
    render(<LikeCommentBar runId="r1" likeCount={0} commentCount={0} memberId="m1" onCommentOpen={() => {}} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/record/r1/like'))
  })

  it('does not fetch like status without memberId', async () => {
    render(<LikeCommentBar runId="r1" likeCount={0} commentCount={0} onCommentOpen={() => {}} />)
    await new Promise(r => setTimeout(r, 50))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- like-comment-bar
```

Expected: FAIL — `LikeCommentBar` not found.

- [ ] **Step 3: Implement LikeCommentBar**

Create `src/presentation/components/feed/like-comment-bar.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  runId: string
  likeCount: number
  commentCount: number
  memberId?: string
  hasPhoto?: boolean
  onCommentOpen: () => void
}

export function LikeCommentBar({ runId, likeCount, commentCount, memberId, hasPhoto = true, onCommentOpen }: Props) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(likeCount)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!memberId) return
    fetch(`/api/record/${runId}/like`)
      .then(r => r.json())
      .then(d => { setLiked(d.liked); setCount(d.likeCount) })
      .catch(() => {})
  }, [runId, memberId])

  async function handleLike() {
    if (!memberId || pending) return
    const prev = { liked, count }
    setPending(true)
    setLiked(l => !l)
    setCount(c => liked ? c - 1 : c + 1)
    try {
      const res = await fetch(`/api/record/${runId}/like`, { method: 'POST' })
      const d = await res.json()
      setLiked(d.liked)
      setCount(d.likeCount)
    } catch {
      setLiked(prev.liked)
      setCount(prev.count)
    } finally {
      setPending(false)
    }
  }

  const barBg = hasPhoto ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.05)'
  const borderColor = hasPhoto ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const textColor = hasPhoto ? 'rgba(255,255,255,0.55)' : '#888'

  return (
    <div style={{
      flexShrink: 0,
      background: barBg,
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${borderColor}`,
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 20,
      position: 'relative', zIndex: 20,
    }}>
      <button
        type="button"
        aria-label={liked ? '좋아요 취소' : '좋아요'}
        onClick={handleLike}
        disabled={!memberId || pending}
        style={{
          background: 'none', border: 'none', padding: 0,
          cursor: memberId ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{
          fontSize: '1.25rem',
          transition: 'transform 0.15s cubic-bezier(0.34,1.5,0.64,1)',
          transform: liked ? 'scale(1.25)' : 'scale(1)',
          display: 'block',
        }}>
          {liked ? '❤️' : '🤍'}
        </span>
        {count > 0 && (
          <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textColor }}>{count}</span>
        )}
      </button>

      <button
        type="button"
        aria-label="댓글 보기"
        onClick={onCommentOpen}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ fontSize: '1.15rem' }}>💬</span>
        {commentCount > 0 && (
          <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textColor }}>{commentCount}</span>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- like-comment-bar
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/feed/like-comment-bar.tsx tests/unit/components/like-comment-bar.test.tsx
git commit -m "feat: add LikeCommentBar component"
```

---

### Task 7: CommentsSheet Component

**Files:**
- Create: `src/presentation/components/feed/comments-sheet.tsx`
- Create: `tests/unit/components/comments-sheet.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/components/comments-sheet.test.tsx`:

```ts
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentsSheet } from '@/presentation/components/feed/comments-sheet'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const fetchMock = vi.fn()
global.fetch = fetchMock

const mockComments = [
  { id: 'c1', memberId: 'm2', memberName: '김민지', memberAvatarUrl: '', body: '멋져요! 👏', createdAt: '2026-05-28T10:00:00Z' },
  { id: 'c2', memberId: 'm1', memberName: '이두승', memberAvatarUrl: '', body: '감사합니다!', createdAt: '2026-05-28T10:05:00Z' },
]

describe('CommentsSheet', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ comments: mockComments }) })
  })

  it('fetches and shows comments when open', async () => {
    render(<CommentsSheet runId="r1" open onClose={() => {}} memberId="m1" />)
    await waitFor(() => expect(screen.getByText('멋져요! 👏')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/record/r1/comments')
  })

  it('shows empty state when no comments', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ comments: [] }) })
    render(<CommentsSheet runId="r1" open onClose={() => {}} memberId="m1" />)
    await waitFor(() => expect(screen.getByText(/첫 번째 댓글/)).toBeInTheDocument())
  })

  it('shows login message when no memberId', async () => {
    render(<CommentsSheet runId="r1" open onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText(/로그인이 필요합니다/)).toBeInTheDocument())
  })

  it('shows delete button only on own comments', async () => {
    render(<CommentsSheet runId="r1" open onClose={() => {}} memberId="m1" />)
    await waitFor(() => screen.getByText('멋져요! 👏'))
    // m1 owns c2 ("감사합니다!"), not c1 ("멋져요!")
    const deleteButtons = screen.getAllByRole('button', { name: /댓글 삭제/ })
    expect(deleteButtons).toHaveLength(1)
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<CommentsSheet runId="r1" open onClose={onClose} memberId="m1" />)
    await waitFor(() => screen.getByText('멋져요! 👏'))
    await userEvent.click(screen.getByRole('button', { name: /닫기/ }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not fetch when closed', async () => {
    render(<CommentsSheet runId="r1" open={false} onClose={() => {}} memberId="m1" />)
    await new Promise(r => setTimeout(r, 50))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- comments-sheet
```

Expected: FAIL — `CommentsSheet` not found.

- [ ] **Step 3: Implement CommentsSheet**

Create `src/presentation/components/feed/comments-sheet.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { AvatarImage } from '../shared/avatar-image'
import type { Comment } from '@/domain/entities/comment'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  runId: string
  open: boolean
  onClose: () => void
  memberId?: string
  memberName?: string
  memberAvatarUrl?: string
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export function CommentsSheet({ runId, open, onClose, memberId, memberName = '', memberAvatarUrl = '' }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/record/${runId}/comments`)
      .then(r => r.json())
      .then(d => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, runId])

  async function handleSubmit() {
    const trimmed = body.trim()
    if (!trimmed || !memberId || submitting) return
    setSubmitting(true)
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      memberId,
      memberName,
      memberAvatarUrl,
      body: trimmed,
      createdAt: new Date().toISOString(),
    }
    setComments(prev => [...prev, optimistic])
    setBody('')
    try {
      const res = await fetch(`/api/record/${runId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })
      const created: Comment = await res.json()
      setComments(prev => prev.map(c => c.id === optimistic.id ? created : c))
    } catch {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    try {
      await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
    } catch {
      fetch(`/api/record/${runId}/comments`)
        .then(r => r.json())
        .then(d => setComments(d.comments ?? []))
        .catch(() => {})
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: open ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
          transition: 'background 0.3s',
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        zIndex: 301,
        background: '#1c1c1c',
        borderRadius: '22px 22px 0 0',
        height: '60vh',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.55)',
      }}>
        {/* Handle */}
        <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 28, height: 3, background: 'rgba(255,255,255,0.18)', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px 12px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontFamily: FONT, fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
            댓글 {comments.length}개
          </span>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: '0.78rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '6px 0' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', fontFamily: FONT, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
              불러오는 중...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', fontFamily: FONT, fontSize: '0.85rem', color: 'rgba(255,255,255,0.22)' }}>
              첫 번째 댓글을 남겨보세요 👟
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, padding: '10px 20px', alignItems: 'flex-start' }}>
                <AvatarImage name={c.memberName} avatarUrl={c.memberAvatarUrl} size={32} bg="rgba(255,255,255,0.1)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <span style={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                      {c.memberName}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', flexShrink: 0, marginLeft: 8 }}>
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: '0.86rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                    {c.body}
                  </div>
                </div>
                {c.memberId === memberId && (
                  <button
                    type="button"
                    aria-label="댓글 삭제"
                    onClick={() => handleDelete(c.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: 'rgba(255,255,255,0.22)', fontSize: '0.7rem', flexShrink: 0,
                    }}
                  >✕</button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        {memberId ? (
          <div style={{
            flexShrink: 0, padding: '10px 16px 18px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <AvatarImage name={memberName} avatarUrl={memberAvatarUrl} size={30} bg="rgba(255,255,255,0.1)" />
            <input
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
              placeholder="댓글 달기..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none',
                borderRadius: 20, padding: '8px 14px',
                fontFamily: FONT, fontSize: '0.85rem', color: '#fff', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!body.trim() || submitting}
              style={{
                background: 'none', border: 'none', flexShrink: 0,
                fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600,
                color: body.trim() ? '#60a5fa' : 'rgba(255,255,255,0.2)',
                cursor: body.trim() ? 'pointer' : 'default',
                padding: '0 4px',
              }}
            >게시</button>
          </div>
        ) : (
          <div style={{
            flexShrink: 0, padding: '16px 20px 20px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            textAlign: 'center',
            fontFamily: FONT, fontSize: '0.8rem', color: 'rgba(255,255,255,0.28)',
          }}>
            로그인이 필요합니다
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- comments-sheet
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/feed/comments-sheet.tsx tests/unit/components/comments-sheet.test.tsx
git commit -m "feat: add CommentsSheet component"
```

---

### Task 8: Wire into DetailSheet

**Files:**
- Modify: `src/presentation/components/feed/detail-sheet.tsx`
- Modify: `tests/unit/components/detail-sheet.test.tsx`

- [ ] **Step 1: Update DetailSheet props type and imports**

At the top of `src/presentation/components/feed/detail-sheet.tsx`, add the new imports after the existing ones:

```ts
import { LikeCommentBar } from './like-comment-bar'
import { CommentsSheet } from './comments-sheet'
```

Update the `Props` type:

```ts
type Props = {
  run: RunLog | null
  open: boolean
  onClose: () => void
  memberId?: string
  memberName?: string
  memberAvatarUrl?: string
  onDeleted?: (id: string) => void
}
```

Update the function signature:

```ts
export function DetailSheet({ run, open, onClose, memberId, memberName = '', memberAvatarUrl = '', onDeleted }: Props) {
```

- [ ] **Step 2: Add commentsOpen state**

Inside the `DetailSheet` function body, after the existing state declarations (after `const [copied, setCopied] = useState(false)`), add:

```ts
const [commentsOpen, setCommentsOpen] = useState(false)
```

Also reset `commentsOpen` when the sheet closes. In the existing `useEffect` that handles `open`, add `setCommentsOpen(false)` to the `else` branch:

```ts
useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden'
    document.body.classList.add('detail-open')
  } else {
    document.body.style.overflow = ''
    document.body.classList.remove('detail-open')
    setPhotoFull(false)
    setDragY(0)
    setIsDragging(false)
    setCommentsOpen(false)
  }
  return () => {
    document.body.style.overflow = ''
    document.body.classList.remove('detail-open')
  }
}, [open])
```

- [ ] **Step 3: Add LikeCommentBar and CommentsSheet to the JSX**

In the Sheet's `<div>` (the one with `data-testid="detail-sheet"`), find the closing `{/* Fullscreen photo hint */}` block. Add `LikeCommentBar` **after** the `{/* Content */}` div and **before** the fullscreen photo hint:

```tsx
{/* Like / Comment action bar */}
<LikeCommentBar
  runId={run.id}
  likeCount={run.likeCount}
  commentCount={run.commentCount}
  memberId={memberId}
  hasPhoto={hasPhoto}
  onCommentOpen={() => setCommentsOpen(true)}
/>
```

After the closing `</div>` of the Sheet div (and before the offscreen ShareCard div), add:

```tsx
{/* Comments sheet — layered above the detail sheet */}
<CommentsSheet
  runId={run.id}
  open={commentsOpen}
  onClose={() => setCommentsOpen(false)}
  memberId={memberId}
  memberName={memberName}
  memberAvatarUrl={memberAvatarUrl}
/>
```

- [ ] **Step 4: Update DetailSheet tests to mock new components**

In `tests/unit/components/detail-sheet.test.tsx`, add mocks for the new components after the existing `vi.mock('next/navigation', ...)`:

```ts
vi.mock('@/presentation/components/feed/like-comment-bar', () => ({
  LikeCommentBar: () => <div data-testid="like-comment-bar" />,
}))

vi.mock('@/presentation/components/feed/comments-sheet', () => ({
  CommentsSheet: () => <div data-testid="comments-sheet" />,
}))
```

Also add a test that the bar is rendered:

```ts
it('renders LikeCommentBar when open', () => {
  render(<DetailSheet run={run} open onClose={() => {}} memberId="m1" />)
  expect(screen.getByTestId('like-comment-bar')).toBeInTheDocument()
})
```

- [ ] **Step 5: Run all tests — expect PASS**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/feed/detail-sheet.tsx tests/unit/components/detail-sheet.test.tsx
git commit -m "feat: wire LikeCommentBar and CommentsSheet into DetailSheet"
```

---

### Task 9: RunCard ❤ Count + Member Info Propagation

**Files:**
- Modify: `src/presentation/components/feed/run-card.tsx`
- Modify: `src/presentation/components/feed/run-feed.tsx`
- Modify: `src/presentation/components/home/home-feed.tsx`
- Modify: `src/app/home/page.tsx`

- [ ] **Step 1: Add ❤ count to RunCard**

In `src/presentation/components/feed/run-card.tsx`, find the `{/* Chips */}` section and add the like count **before** the chip row. Replace the entire chips `<div>` block:

```tsx
{/* Like count + Chips */}
<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 14px', flexWrap: 'wrap' }}>
  {run.likeCount > 0 && (
    <div style={{
      background: t.chip, borderRadius: 20, padding: '4px 10px',
      fontSize: '0.6rem', fontWeight: 500, color: t.chipText,
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      ❤ {run.likeCount}
    </div>
  )}
  {chips.length > 0 ? chips.map(c => (
    <div key={c} style={{
      background: t.chip, borderRadius: 20, padding: '4px 10px',
      fontSize: '0.6rem', fontWeight: 500, color: t.chipText,
    }}>{c}</div>
  )) : (
    <div style={{ fontSize: '0.6rem', color: t.chipText, opacity: 0.5 }}>{run.date}</div>
  )}
</div>
```

- [ ] **Step 2: Run RunCard tests — expect PASS**

```bash
npm test -- run-card
```

Expected: all existing RunCard tests still pass.

- [ ] **Step 3: Add memberName/memberAvatarUrl to PhotoGrid and RunFeed props**

In `src/presentation/components/feed/run-feed.tsx`:

Update `PhotoGrid` props type (find `export function PhotoGrid(` and update the props object):

```ts
export function PhotoGrid({ runs: initialRuns, memberId, memberName = '', memberAvatarUrl = '', triggerRun, onTriggerConsumed, initialOffset = PAGE_LIMIT }: {
  runs: RunLog[]
  memberId?: string
  memberName?: string
  memberAvatarUrl?: string
  triggerRun?: RunLog | null
  onTriggerConsumed?: () => void
  initialOffset?: number
}) {
```

Inside `PhotoGrid`, update the `<DetailSheet>` render to pass the new props:

```tsx
<DetailSheet
  run={selected}
  open={Boolean(selected)}
  onClose={() => setSelected(null)}
  memberId={memberId}
  memberName={memberName}
  memberAvatarUrl={memberAvatarUrl}
  onDeleted={(id) => {
    setSelected(null)
    setRuns(prev => prev.filter(r => r.id !== id))
  }}
/>
```

Update `RunFeed` props type (find the top-level `type Props`):

```ts
type Props = {
  runs: RunLog[]
  triggerRun?: RunLog | null
  onTriggerConsumed?: () => void
  memberId?: string
  memberName?: string
  memberAvatarUrl?: string
}
```

Update the `RunFeed` function signature:

```ts
export function RunFeed({ runs, triggerRun, onTriggerConsumed, memberId, memberName = '', memberAvatarUrl = '' }: Props) {
```

Inside `RunFeed`, update the `<DetailSheet>` render:

```tsx
<DetailSheet
  run={selected}
  open={Boolean(selected)}
  onClose={() => setSelected(null)}
  memberId={memberId}
  memberName={memberName}
  memberAvatarUrl={memberAvatarUrl}
  onDeleted={() => setSelected(null)}
/>
```

- [ ] **Step 4: Pass member info from HomeFeed**

In `src/presentation/components/home/home-feed.tsx`, update the `Props` type to add the new fields:

```ts
type Props = {
  recentRuns: RunLog[]
  myRuns: RunLog[]
  memberId: string
  memberName?: string
  memberAvatarUrl?: string
  crew: CrewMember[]
  weeklyBars: WeeklyBar[]
  weeklyTotalHours?: number
  initialOffset?: number
}
```

Update the `HomeFeed` function signature:

```ts
export function HomeFeed({ recentRuns, myRuns, memberId, memberName = '', memberAvatarUrl = '', crew, weeklyBars, weeklyTotalHours = 0, initialOffset = 20 }: Props) {
```

Find the `<PhotoGrid` usage and add the new props:

```tsx
<PhotoGrid
  runs={recentRuns}
  memberId={memberId}
  memberName={memberName}
  memberAvatarUrl={memberAvatarUrl}
  ...
/>
```

Find the `<RunFeed` usage (for `myRuns`) and add the new props:

```tsx
<RunFeed runs={myRuns} memberId={memberId} memberName={memberName} memberAvatarUrl={memberAvatarUrl} />
```

- [ ] **Step 5: Pass member info from HomePage**

In `src/app/home/page.tsx`, update the `<HomeFeed>` usage to pass `memberName` and `memberAvatarUrl`:

```tsx
<HomeFeed
  recentRuns={recentRuns}
  myRuns={myRuns}
  memberId={memberId}
  memberName={memberName}
  memberAvatarUrl={memberAvatarUrl}
  crew={crew}
  weeklyBars={weeklyBars}
  weeklyTotalHours={weeklyTotalHours}
/>
```

- [ ] **Step 6: Run all tests — expect PASS**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add \
  src/presentation/components/feed/run-card.tsx \
  src/presentation/components/feed/run-feed.tsx \
  src/presentation/components/home/home-feed.tsx \
  src/app/home/page.tsx
git commit -m "feat: show like count on run cards and propagate member info to CommentsSheet"
```

---

## Final Verification

- [ ] Start dev server: `npm run dev`
- [ ] Open a run record → detail sheet shows like/comment bar at bottom
- [ ] Tap ❤️ → count changes immediately (optimistic), stays after refresh
- [ ] Tap 💬 → CommentsSheet slides up above the detail
- [ ] Post a comment → appears immediately, survives re-open
- [ ] Tap ✕ on own comment → comment removed
- [ ] Close CommentsSheet → detail sheet is still visible
- [ ] Run cards show `❤ N` when likeCount > 0
- [ ] Non-logged-in view: bar visible, tapping heart does nothing; comments list visible, input shows "로그인이 필요합니다"
