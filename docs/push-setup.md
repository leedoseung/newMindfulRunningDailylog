# Web Push 셋업 (P4)

## 셋업 단계

1. VAPID 키 생성 (한 번)
   ```bash
   node scripts/generate-vapid-keys.mjs
   ```
2. 출력된 3 라인을 `.env.local` 에 추가:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...` (클라이언트 노출)
   - `VAPID_PRIVATE_KEY=...` (서버 전용)
   - `VAPID_SUBJECT=mailto:admin@example.com`
3. Supabase Dashboard → Project Settings → Edge Functions → Secrets 에 동일 3 값 등록 (Edge Function 이 사용)
4. `supabase/migrations/20260615_push_subscriptions.sql` 이미 적용됨
5. `mission-reminder` Edge Function 배포 (P4 Task 10)
6. pg_cron 스케줄 등록 (P4 Task 10 마이그레이션)

## iOS 사용자 안내

- iOS Safari 16.4+ 만 PWA 푸시 지원
- "공유 → 홈 화면에 추가" 후 홈 화면 아이콘으로 앱 다시 열어야 푸시 권한 요청 가능
- 미설치 사용자 = `iOSInstallGuideSheet` 자동 노출 (P4 Task 9)

## VAPID 키 회전

키를 새로 생성하면 모든 구독이 무효화됨. 사용자가 다시 권한 허용 후 재구독 필요.
