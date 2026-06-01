# Likes & Comments Feature Design

Date: 2026-06-01

## Overview

Add social interactions to running log records: likes (heart toggle) and comments (Instagram-style thread). Likes are toggled from the detail page and shown as a heart+count on run cards. Comments open as a new bottom sheet layered over the detail sheet.

---

## UI Behavior

### Run Card / GridCell
- Show `❤ {likeCount}` at the bottom of each card when `likeCount > 0`
- No change to tap behavior — still opens DetailSheet

### DetailSheet — Bottom Action Bar
- Fixed bar at the bottom of the sheet (above the sheet's bottom edge)
- Contains: `❤️ {likeCount}` (tappable toggle) and `💬 {commentCount}` (opens CommentsSheet)
- Heart fills red when `likedByMe === true`; outline when false
- Visible to all users; tapping requires login (shows nothing if not a member)

### CommentsSheet (new component)
- Slides up over the DetailSheet (backdrop dims the detail behind)
- Handle bar + "댓글 N개" header + close (✕) button
- Scrollable list of comments: avatar, member name, comment body, time ago
- Own comments show a small ✕ button on the right side of the comment row
- Fixed input row at bottom: avatar + text input + "게시" button
- Non-member users see the list but the input row shows "로그인이 필요합니다"

---

## Data Model

### `likes` table
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
run_log_id  uuid NOT NULL REFERENCES run_logs(id) ON DELETE CASCADE
member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE
created_at  timestamptz NOT NULL DEFAULT now()
UNIQUE (run_log_id, member_id)
```

RLS: SELECT public. Writes bypass RLS via `createAdminClient()` (service_role) — auth checks handled in API routes, consistent with existing codebase pattern.

### `comments` table
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
run_log_id  uuid NOT NULL REFERENCES run_logs(id) ON DELETE CASCADE
member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE
body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500)
created_at  timestamptz NOT NULL DEFAULT now()
```

RLS: SELECT public. Writes bypass RLS via `createAdminClient()` — auth checks handled in API routes.

---

## RunLog Type Changes

Add to `RunLog` entity:
```ts
likeCount: number     // default 0
commentCount: number  // default 0
```

`likedByMe: boolean` is **not** part of RunLog — fetched separately when DetailSheet opens (requires session context).

### SQL aggregation
The existing `SELECT_FIELDS` in `SupabaseRunLogRepository` is extended:
```sql
(SELECT COUNT(*) FROM likes WHERE run_log_id = run_logs.id)::int AS like_count,
(SELECT COUNT(*) FROM comments WHERE run_log_id = run_logs.id)::int AS comment_count
```

---

## API Routes

### `POST /api/record/[id]/like`
- Auth required (401 if not logged in)
- Toggle: if like exists → delete and return `{ liked: false, likeCount }`, else insert → return `{ liked: true, likeCount }`
- Uses upsert with conflict resolution on `(run_log_id, member_id)`

### `GET /api/record/[id]/like`
- Auth required
- Returns `{ liked: boolean, likeCount: number }`
- Called once when DetailSheet opens

### `GET /api/record/[id]/comments`
- Public (no auth required)
- Returns `{ comments: Comment[] }` ordered by `created_at ASC`
- `Comment` type: `{ id, memberId, memberName, memberAvatarUrl, body, createdAt }`

### `POST /api/record/[id]/comments`
- Auth required
- Body: `{ body: string }` (validated: 1–500 chars)
- Returns created `Comment`

### `DELETE /api/comments/[commentId]`
- Auth required, own comment only (403 if not owner)
- Returns `{ ok: true }`

---

## New Components

### `LikeCommentBar`
```
Props: { runId, likeCount, commentCount, likedByMe, memberId, onCommentOpen }
```
- Manages optimistic like toggle locally
- On mount (when detail opens): calls `GET /api/record/[id]/like` to hydrate `likedByMe`
- On heart tap: optimistic update → `POST /api/record/[id]/like` → reconcile with server response

### `CommentsSheet`
```
Props: { runId, open, onClose, memberId }
```
- Fetches comments when `open` becomes true
- Adds comment optimistically, reconciles on success
- Delete: swipe-left on own comment → confirm → `DELETE /api/comments/[id]`
- Input: controlled textarea, submit on "게시" tap or Enter (mobile: send button)

---

## Component Changes

| File | Change |
|---|---|
| `domain/entities/run-log.ts` | Add `likeCount`, `commentCount` |
| `infrastructure/supabase/run-log-repository.ts` | Extend SELECT with count subqueries |
| `presentation/components/feed/run-card.tsx` | Add ❤ count chip (hidden when 0) |
| `presentation/components/feed/detail-sheet.tsx` | Add `LikeCommentBar` at bottom, manage CommentsSheet open state |
| `presentation/components/feed/run-feed.tsx` | Pass `memberId` through to DetailSheet (already done) |

New files:
- `presentation/components/feed/like-comment-bar.tsx`
- `presentation/components/feed/comments-sheet.tsx`

---

## Out of Scope

- Real-time updates (no Supabase Realtime subscription)
- Comment replies / threads
- Like notifications
- Emoji reactions
- Pagination for comments (assume <100 comments per run initially)
