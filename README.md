# 마인드풀러닝 (Mindful Running)

마음챙김 달리기 기록 앱 — Next.js 15 + Clean Architecture

## 기술 스택

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Testing:** Vitest + React Testing Library + Playwright

## 시작하기

```bash
npm install
npm run dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 환경 변수 설정

`.env.local` 파일을 생성하고 Supabase 자격증명을 입력하세요:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## 테스트

```bash
npm test                    # 단위 테스트
npm run test:integration    # 통합 테스트 (.env.test.local 필요)
npm run test:e2e            # E2E 테스트 (dev 서버 실행 상태)
```

## 빌드 및 배포

```bash
npm run build               # 프로덕션 빌드
npm run preview             # 빌드 결과 미리보기
```

Vercel에서 배포:

1. GitHub 저장소에 코드 푸시
2. [Vercel Dashboard](https://vercel.com/dashboard)에서 프로젝트 생성
3. 환경 변수 설정 후 배포

## 구조

```
app/
├── page.tsx              # 홈/피드 페이지
├── leaderboard/          # 리더보드 페이지
├── api/                  # API 라우트
└── components/           # UI 컴포넌트

core/
├── domain/               # 엔티티, 유스케이스
├── application/          # 애플리케이션 서비스
└── infrastructure/       # 저장소, 외부 API

tests/
├── unit/                 # 단위 테스트
├── integration/          # 통합 테스트
└── e2e/                  # E2E 테스트
```
