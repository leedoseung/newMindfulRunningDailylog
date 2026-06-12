# Supabase Edge Functions — Lunge Challenge

## Functions

| Name | Schedule (KST) | Purpose |
|---|---|---|
| `daily-pass-check` | 매일 00:00 (UTC 15:00) | (1) `upcoming → active` 시즌 자동 전환. (2) 어제 0개 미달성자 → 면죄권 잔여>0 = 자동 차감 + `mark_mission_log_pass`; 잔여=0 = `failed_at` 기록 |
| `issue-completion-badges` | 매일 01:00 (UTC 16:00) | 시즌 종료일 다음 날 → 활성 참가자 중 `count>=100 OR used_pass` 일수 == `duration_days` 인 멤버에게 `completed_at` + `grant_challenge_badge` RPC + 시즌 `status='ended'` |
| `mission-reminder` (P4) | 매일 20:00 (UTC 11:00) | 오늘 카운트 0인 참가자에게 Web Push 발송 |

## 배포

```bash
npx supabase functions deploy daily-pass-check
npx supabase functions deploy issue-completion-badges
```

배포 시 자동으로 사용 가능한 환경 변수:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (자동 주입)

## 로컬 테스트

```bash
# 별도 터미널에서 함수 서빙
npx supabase functions serve daily-pass-check --no-verify-jwt

# 호출
curl -H "Authorization: Bearer test" -X POST http://localhost:54321/functions/v1/daily-pass-check
```

## 스케줄 (pg_cron + pg_net)

`supabase/migrations/20260614_cron_schedules.sql` 에서 등록.
- 인증: Supabase Vault 의 `service_role_key` 시크릿을 `vault.decrypted_secrets` 로 lookup
- `unschedule` 패턴으로 idempotent

## 작업 흐름

1. (KST 00:00) `daily-pass-check`:
   - 첫 단계: `upcoming → active` 자동 전환 (시작일 도달 시즌 강제 promote)
   - 두 번째: 어제 미달성자 처리
2. (KST 01:00) `issue-completion-badges`:
   - 시즌 종료일 다음 날에만 동작
   - 100일 완주자 → `completed_at` + `grant_challenge_badge` RPC + `status='ended'`
3. 실패한 참가자 → P5 UI 가 `failed_at` 감지 → read-only 모드
4. 완주자 → P5 인증서 + 프로필 영구 뱃지

## Vault 시크릿 설정 (운영 setup)

이미 적용됨. 재설정 필요 시:

```sql
DELETE FROM vault.secrets WHERE name = 'service_role_key';
SELECT vault.create_secret('<SERVICE_ROLE_JWT>', 'service_role_key');
```
