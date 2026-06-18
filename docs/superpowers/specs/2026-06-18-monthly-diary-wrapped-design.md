# 월간 달리기 일기장 — Wrapped 스타일 공유 페이지

**Date:** 2026-06-18
**Status:** Design — pending user approval
**Owner:** duvis

## 1. Overview

사용자(멤버)의 한 달 달리기 기록을 **Spotify Wrapped 스타일 인터랙티브 카드 시퀀스**로 보여주는 공개 공유 페이지. CalendarView 월 헤더의 share 아이콘에서 트리거. 7개 카드 자동 진행(탭/스와이프 가능) → 마지막 카드에서 "전체 일기" 스크롤 페이지로 진입 가능. 카카오톡/SNS URL 공유 시 OG 카드 노출.

## 2. User Stories

- **As a member**, I tap the share icon on my CalendarView month header → I get a shareable URL for that month's diary.
- **As a recipient (anyone with link)**, I open the URL → I see an animated 7-card recap of that person's month, can tap/swipe through, optionally play BGM.
- **As a recipient**, after the last card, I can tap "전체 일기 보기" to read all runs in detail (full thoughts).
- **As an owner**, my diary defaults to noindex (not on Google), but link sharing works.

## 3. Routes

| URL | Component | Purpose |
|---|---|---|
| `/diary/[memberId]/[YYYY-MM]` | `DiaryWrappedPage` (server) | Wrapped 7-card sequence |
| `/diary/[memberId]/[YYYY-MM]/all` | `DiaryFullPage` (server) | Full scroll diary (all thoughts, all runs) |
| `/api/og/diary/[memberId]/[YYYY-MM]` | Next OG image route | Dynamic OG image (1200×630) |

- `memberId` validated against DB. Invalid → 404.
- `YYYY-MM` validated regex. Future month → 404. Pre-app-existence month → 404.
- Both pages render with `noindex` robots meta.

## 4. Wrapped Card Sequence (7 cards)

Each card 4.5s auto-advance. Tap right (or `→`): next. Tap left (or `←`): previous. Long-press (or `Space`): pause. Swipe horizontal: ±1.

### Card 1 — Intro
- Bg: gradient `#0F172A → #1E1B4B`
- Content: `{memberName}` (label) / `2026.6` (display, 3.4rem 800) / "너의 한 달" / "탭해서 시작"

### Card 2 — Total
- Bg: same
- Content: "이번 달 너는" / **`{runs.length}번`** (4.5rem 800, gradient text `#F472B6 → #A78BFA`) / "달렸어" / "총 {hours}시간 {min}분"

### Card 3 — Streak
- Bg: gradient `#1E1B4B → #7C2D92`
- Content: "STREAK" / **`{maxStreak}일`** (5rem 800) / "연속 달리기 최장 기록"
- Bottom: 최장 streak 마지막 5일의 요일 칩 (분홍 원 + 요일 글자)
- **Skip card if `runs.length < 3`**

### Card 4 — Longest
- Bg: 그 run의 `photoUrl` (full bleed, 어두운 그라디언트 오버레이). 사진 없으면 `#FB7185 → #F472B6` fallback
- Content: "가장 길게 달린 날" / **`{hours}h {min}m`** (2.4rem 800) / "{location} · {date}" / `thoughtAfter` 첫 50자 인용

### Card 5 — Voice
- Bg: `#FAFAFA` (라이트 카드, 시퀀스 중 break)
- Content: "너의 한 마디" / **`"{random thoughtAfter}"`** (1.4rem 700, 큰 인용) / `{date} · {title}`
- **Random pick logic**: `thoughtAfter` 채워진 runs 중 random 1개.
  - **Client-side pick**: Server는 `thoughtAfter` non-empty `RunLog[]` 전체 props로 전달, client에서 mount 시 `Math.random` 1회 선택. 이유: ISR(1h) 캐시 + server random = 1h 동안 같은 인용. Client pick = 매 새로고침마다 다른 인용 (브라우저 새로고침 = 새 경험).
- **Skip if 모든 run의 `thoughtAfter`가 빈 문자열**

### Card 6 — Album
- Bg: `#111`
- Content: "앨범" / "한 달 모두."
- 3×3 grid (또는 4-9개 동적), 사진 있는 run의 `photoUrl` 썸네일, 날짜 역순
- 9장 초과 시 "+N more"
- **Skip if 사진 0장**

### Card 7 — Share (CTA)
- Bg: gradient `#7C2D92 → #0F172A`
- Content: 🎉 / "다음 달도 달려보자." / "2026.6 마감"
- 버튼 2개:
  - **↗ 공유하기** → Web Share API (mobile native sheet) / clipboard fallback (desktop)
  - **↻ 처음부터** → reset to Card 1
- 추가 링크 (작게): **전체 일기 보기 →** `/diary/[memberId]/[YYYY-MM]/all`

## 5. Empty / Edge Cases

| Condition | Behavior |
|---|---|
| `runs.length === 0` | 3-card 변형: Intro → "쉬어가는 달" (mindful logo + 메시지) → Share |
| `runs.length === 1-2` | Streak 카드 생략 (5장) |
| 사진 0장 | Album 카드 생략 |
| 모든 `thoughtAfter` 빈 문자열 | Voice 카드 생략 |
| 미래 월 (`YYYY-MM > 현재월`) | 404 |
| invalid memberId | 404 |
| `prefers-reduced-motion: reduce` | 자동 진행 정지, 수동 탭만, 카드 전환 fade 0ms (instant) |

## 6. Full Diary Page (`/all`)

별도 server-rendered 페이지. Wrapped와 같은 모던 톤 유지 (Pretendard, flat, #FAFAFA bg).

### Layout
- 헤더: `2026.6 · {memberName}` (1.8rem 700), 작은 카운트 "18 runs"
- 본문: run 카드 세로 list, 날짜 역순
- 각 카드:
  - 날짜 라벨 "06.17 화" (0.55rem letter-spacing)
  - 제목 (1.1rem 600)
  - 사진 (있으면, aspect-ratio 4:5, border-radius 12px) — 없으면 생략
  - thought 섹션 — `Before` / `During` / `After` (라벨 0.55rem 회색, 본문 0.875rem 400)
  - 메타: durationMin · location · runTime (한 줄, 0.65rem 회색)
- 푸터: "Daily Mindful Running · daily-running.app" + Wrapped로 돌아가는 링크

### 비-Wrapped 디자인 (편한 독서)
- 회전/스토리 인터랙션 없음. 순수 스크롤.
- 글 본문 모두 표시 (Wrapped는 발췌, all은 full).

## 7. OG Image (Dynamic)

`/api/og/diary/[memberId]/[YYYY-MM]` — Next.js OG image generation.

- Size: 1200×630
- Bg: 그 달 첫 사진 (날짜순 첫 run의 `photoUrl`). 사진 없으면 `#FB7185 → #7C3AED` gradient
- Overlay: 어두운 그라디언트 (가독성)
- Text: "{memberName}" (small label) / "2026.6 일기" (large display)
- 캐싱: `Cache-Control: max-age=3600, s-maxage=3600`

## 8. Trigger UI — CalendarView 월 헤더 수정

기존 `CalendarView` 월 헤더 좌(‹)/우(›) 사이에 share 아이콘 추가:

```
[‹] [2026년 6월] [↗] [›]
```

- 아이콘: SVG share icon (24×24, line-style)
- 탭: `navigator.share({ url, title, text })` 호출. fail/unsupported → clipboard write + toast "링크 복사됨"
- URL = `${origin}/diary/${currentUser.memberId}/${viewYear}-${String(viewMonth+1).padStart(2,'0')}`
- 본인 캘린더에서만 노출 (memberId === currentUser.memberId). 다른 사람 캘린더 보는 경우는 없으므로 항상 노출.

## 9. Music (Optional)

- 기본 무음. 모든 Wrapped 카드 좌하단에 작은 아이콘 (🔇 / 🔊 토글)
- 탭하면 single bundled ambient track 재생 (loop)
- 트랙: TBD (Creative Commons ambient, ~30s 루프, <100KB mp3)
- 사용자가 한 번 활성화하면 카드 전환 간에도 유지

## 10. Design Tokens

```css
/* Colors */
--diary-bg: #FAFAFA;
--diary-fg: #111;
--diary-dark-1: #0F172A;
--diary-dark-2: #1E1B4B;
--diary-dark-3: #7C2D92;
--diary-accent-from: #F472B6;
--diary-accent-to: #A78BFA;
--diary-hot-from: #FB7185;
--diary-hot-to: #F472B6;

/* Typography */
font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif;
/* display: weight 800, letter-spacing -0.04em */
/* body: weight 400, letter-spacing -0.01em, line-height 1.55 */

/* Motion */
--ease: cubic-bezier(0.2, 0.8, 0.2, 1);
--dur-card: 300ms;
--dur-auto: 4500ms;
```

- **Pretendard only** (Caveat 없음). 영문 숫자도 Pretendard.
- Flat design (그림자 거의 없음). 컬러 contrast로 분리.

## 11. Mobile Sizing

- 최소 타깃: iPhone SE **375px** width
- 카드 전체: `width: 100vw; height: 100vh` (full bleed)
- safe area inset 적용 (`env(safe-area-inset-*)`)
- progress bar: top 10px, padding 12px 양쪽
- 본문 폰트 최소 14px (0.875rem)
- 터치 타깃 44px 이상 (share/replay 버튼)

## 12. Data & API

### Server component (`/diary/[memberId]/[YYYY-MM]/page.tsx`)
- Direct DB 조회 (Supabase) — `run_logs` where `memberId = X AND date BETWEEN month_start AND month_end`, order by date desc
- Return RunLog[] → 카드 sequence 계산 (computeWrappedStats helper)
- 사용자 인증 불필요 (public)

### Caching
- Next.js ISR: `export const revalidate = 3600` (1h)
- 새 run 추가/수정/삭제 시 `revalidatePath('/diary/[memberId]/[YYYY-MM]')` (해당 월만)
- `record/route.ts` POST/PATCH/DELETE에서 revalidate 호출

### Stats helpers (new file: `src/domain/diary/wrapped-stats.ts`)
```ts
export type WrappedStats = {
  totalRuns: number
  totalMinutes: number
  maxStreak: number
  streakLastDays: string[]  // 마지막 streak의 요일 ['월','화',...]
  longestRun: RunLog | null
  voiceQuote: { run: RunLog; quote: string } | null
  albumPhotos: { runId: string; photoUrl: string }[]  // 사진 있는 run만, 날짜 역순
}

export function computeWrappedStats(runs: RunLog[]): WrappedStats
```

## 13. Files to Create / Modify

### New
- `src/app/diary/[memberId]/[yearMonth]/page.tsx` — Wrapped Server Component
- `src/app/diary/[memberId]/[yearMonth]/all/page.tsx` — Full scroll Server Component
- `src/app/api/og/diary/[memberId]/[yearMonth]/route.tsx` — OG image (next/og)
- `src/presentation/components/diary/wrapped-deck.tsx` — Client component (auto-advance, swipe, audio control)
- `src/presentation/components/diary/wrapped-cards/` — individual card components (intro/total/streak/longest/voice/album/share)
- `src/presentation/components/diary/full-diary-list.tsx` — Server component for /all
- `src/presentation/components/diary/share-button.tsx` — Client component (Web Share API + clipboard fallback)
- `src/domain/diary/wrapped-stats.ts` — Pure stat calculation
- `src/domain/diary/month-range.ts` — Helper: parse YYYY-MM → date range
- `public/audio/diary-ambient.mp3` — TBD CC license track
- `tests/unit/diary/wrapped-stats.test.ts` — Stats calculation tests

### Modify
- `src/presentation/components/my-records/calendar-view.tsx` — Add share icon to month header
- `src/app/api/record/route.ts` — Add `revalidatePath` for affected month after POST/PATCH/DELETE
- (검토) `package.json` — May need `@vercel/og` if not present (already in Next 15)

## 14. Accessibility

- `prefers-reduced-motion: reduce` → 자동 진행 OFF, fade 0ms
- 각 카드 `<section role="region" aria-label="...">`
- 버튼 keyboard accessible (Tab/Enter/Space)
- progress bar `<div role="progressbar" aria-valuenow="3" aria-valuemax="7">`
- 음악 토글 `aria-pressed`, `aria-label="배경 음악"`
- 색 대비 WCAG AA (white on gradient backgrounds — 어두운 오버레이로 보강)

## 15. Privacy

- public URL = 누구나 열람. 본인이 명시적 share = consent.
- `<meta name="robots" content="noindex,nofollow">` 기본
- OG에 표시 = 사진 + 월 + 이름. 의도된 노출.
- 글 본문은 `/all` 페이지에만 (Wrapped는 발췌). 검색 노출 X (noindex).

## 16. Out of Scope (this spec)

- 연간 일기장 (12개월 합본) — 추후
- 다른 멤버 일기장으로 jump (next/prev member) — 추후
- 일기장 비공개 토글 — 추후 (현재는 항상 public)
- 댓글 / 좋아요 (페이지 자체에) — 일기는 read-only
- 인쇄/PDF 다운로드 — 추후
- 음악 트랙 사용자 선택 — 단일 bundled track만

## 17. Open Questions (to resolve in plan)

1. ambient track 어떤 CC source 사용? (Pixabay Music / Mixkit / Free Music Archive 후보)
2. 처음부터 reset 시 progress bar/타이머 완전 초기화 vs 같은 random voice 유지?
3. Full diary 페이지 인증 필요? (현재 public 결정 따라 X — 재확인)
4. share URL에 utm tracking 붙일지?

---

## Decision Log (확정 사양 요약)

| 항목 | 결정 |
|---|---|
| 형식 | Web 공유 링크 |
| 접근 권한 | Public (anyone with link) |
| 트리거 | CalendarView 월 헤더 share 아이콘 |
| 공유 UX | Web Share API + clipboard fallback |
| 표시 필드 | title + photo + date + thoughtBefore + thoughtDuring + thoughtAfter |
| 빈 사진 처리 | Card 4/6에서 fallback gradient |
| 빈 달 | 3-card 변형 (intro + 쉬어가는달 + share) |
| OG 이미지 | 동적 생성 (그 달 첫 사진 + 'YYYY.M 일기') |
| 레이아웃 | **Wrapped 7-card sequence** (Spotify Wrapped 모방) |
| VOICE 인용 | Random pick |
| 전체 일기 페이지 | 있음 (별도 URL `/all`) |
| 카드 수 | 7장 (intro/total/streak/longest/voice/album/share) |
| 음악 | 선택 재생 (기본 무음, 좌하단 토글 아이콘) |
| 디자인 톤 | Modern, Pretendard only, flat, gradient accent |
| Polaroid / Caveat / sepia | **폐기** (촌스러움) |
| noindex | 적용 |
| 캐시 | ISR 1h + revalidate on write |
