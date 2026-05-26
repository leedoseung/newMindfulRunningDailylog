# 인증 시스템 설계 (Sub-project 2)

## 목표

Supabase Auth 기반 인증 도입. 전체 앱을 로그인 필수로 보호하고, 로그인 후 "내 기록" 탭과 본인 기록 수정/삭제 기능을 제공한다.

## 아키텍처

**방식:** Supabase Auth + Next.js Middleware  
**로그인:** 카카오 OAuth + 이메일 Magic Link  
**멤버 연결:** 첫 로그인 시 `/link-member`에서 기존 멤버 선택 → `members.auth_user_id` 업데이트

---

## DB 변경

```sql
ALTER TABLE members
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);
```

멤버 1명 = auth 유저 1명. 첫 로그인 전까지 `NULL`.

---

## 인증 플로우

```
비로그인 요청
    ↓
middleware.ts — 세션 쿠키 확인 (DB 쿼리 없음)
    ↓
[세션 없음] → /login 리다이렉트
[세션 있음] → user.user_metadata.member_id 확인
                  ↓
             [없음] → /link-member (첫 로그인 1회)
             [있음] → 정상 통과
```

**멤버 연결 시:** `POST /api/auth/link-member`가 두 가지 동시 처리
1. `members.auth_user_id = auth_user_id` (DB 업데이트)
2. `supabase.auth.updateUser({ data: { member_id } })` (메타데이터 저장)

→ 이후 Middleware가 DB 쿼리 없이 `user_metadata.member_id` 유무만 확인

---

## 새 파일 구조

```
src/
  middleware.ts                          — 라우트 보호
  app/
    login/page.tsx                       — 로그인 페이지
    auth/callback/route.ts               — OAuth/Magic Link 콜백
    link-member/page.tsx                 — 첫 로그인 멤버 연결
    api/
      auth/link-member/route.ts          — POST: members.auth_user_id 업데이트
      auth/me/route.ts                   — GET: 로그인 유저의 member 반환
      record/[id]/route.ts               — PUT(수정) + DELETE(삭제)
  presentation/components/
    my-records/
      my-records-tab.tsx                 — 내 기록 목록 + 통계
      my-record-card.tsx                 — 기록 카드 (··· 메뉴 포함)

수정:
  app/page.tsx                           — 전체 피드 / 내 기록 탭 추가
  app/record/page.tsx                    — 멤버 드롭다운 제거, 세션에서 memberId 조회
  presentation/components/form/
    run-log-form.tsx                     — memberId prop 제거 → 서버에서 주입
```

---

## 페이지 상세

### `/login`

- 배경: 그라데이션 애니메이션 (`-45deg`, `#0f1923 → #1e3a5f → #2E91FC`, 8초 루프)
- 상단: 로고(흰색) + 인용구 "할 수 있는 달리기를 하다보면 할 수없는 달리기를 하게된다"
- 하단: 원형 아이콘 버튼 2개
  - 카카오 (노란 원, K 아이콘) → Supabase OAuth URL로 이동
  - 이메일 (반투명 원, ✉ 아이콘) → 클릭 시 이메일 입력창 슬라이드업
- Magic Link 발송 후: "이메일을 확인해주세요" 메시지로 전환

### `/auth/callback`

- `GET /auth/callback?code=...` — Supabase가 리다이렉트
- `supabase.auth.exchangeCodeForSession(code)` 호출
- 세션 교환 후 `/` 로 리다이렉트 (middleware가 link-member 필요 여부 판단)

### `/link-member`

- 서버에서 전체 멤버 목록 조회
- 이미 `auth_user_id`가 연결된 멤버는 목록에서 제외
- 본인 이름 선택 → `POST /api/auth/link-member` → 홈으로 이동

### `/` (홈) — 탭 추가

```
[ 전체 피드 ]  [ 내 기록 ]
```

- 전체 피드: 기존 RunFeed (최근 7일 전체 기록)
- 내 기록: MyRecordsTab (로그인 유저의 기록만)

### `내 기록` 탭 구성

1. **통계 요약 카드**: 이번달 횟수 + 누적 시간
2. **기록 목록**: 날짜 · 장소 · 시간 · 제목
   - 각 카드 우측 `···` 메뉴 → 수정 / 삭제
3. **수정**: `/record?edit=[id]` — 기존 값 pre-fill
4. **삭제**: 확인 다이얼로그 → `DELETE /api/record/[id]`

### `/record` — 멤버 드롭다운 제거

- 서버에서 세션 → `auth_user_id` → member 조회
- `RunLogForm`에 `memberId: string` 직접 전달 (드롭다운 없음)
- `?edit=[id]` 쿼리 파라미터 있으면 기존 기록 pre-fill → PUT 요청

---

## API 라우트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/link-member` | `{ memberId }` → members.auth_user_id 업데이트 |
| GET | `/api/auth/me` | 세션 → member 반환 |
| PUT | `/api/record/[id]` | 본인 기록 수정 |
| DELETE | `/api/record/[id]` | 본인 기록 삭제 |

**보안:** PUT/DELETE는 세션에서 auth_user_id 확인 → `run_logs.member_id`와 대조, 불일치 시 403 반환

---

## 에러 처리

| 상황 | 처리 |
|---|---|
| 카카오 로그인 취소 | `/login`으로 복귀, "로그인이 취소되었습니다" 안내 |
| Magic Link 만료 | `/login?error=expired` → "링크가 만료되었습니다. 다시 요청해주세요" |
| 이미 연결된 멤버 선택 | "이미 다른 계정에서 사용 중인 이름입니다" 에러 |
| 타인 기록 수정/삭제 | 403 Forbidden |

---

## 테스트 범위

- `middleware.ts` — 세션 없을 때 `/login` 리다이렉트
- `GET /api/auth/me` — auth_user_id → member 조회
- `DELETE /api/record/[id]` — 본인 기록 검증 로직
- `MyRecordsTab` — 통계 카드 렌더링
