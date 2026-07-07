---
name: supabase-downgrade-immediate
description: Supabase Pro→Free 다운그레이드는 즉시 적용 — cycle 종료 대기 X. 한도 초과 상태로 다운하면 프로젝트 read-only / unresponsive
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5f5bb457-a6ab-408c-bd89-2096053c5295
---

Supabase Pro 플랜 취소 시 다운그레이드는 **즉시 적용**된다. "결제 cycle 끝까지 Pro 유지 후 자동 전환" 아님.

다운그레이드 확인 다이얼로그 문구 (2026-06-16 기준):
- "your projects could become unresponsive or enter read only mode" (Free 한도 초과 시)
- "Add ons will be removed" (즉시 제거)
- "Projects will be paused after a week of inactivity" (Free 정책 즉시 적용)

**Why**: 이전에 "취소 = cycle 끝까지 유지" 로 잘못 안내했다가 사용자가 다이얼로그 캡처로 정정. 다른 SaaS 의 일반 패턴 (Vercel, GitHub 등) 과 달라 헷갈리기 쉬움.

**How to apply**: Supabase Pro 취소 권하기 전 반드시 모든 지표 Free 한도 내 확인.

Free 한도 (2026-06 시점):
- Database 500MB
- Storage 1GB
- Egress 5GB/월
- MAU 50k
- Storage Image Transformations 100/월
- Edge function invocations 500k/월
- Realtime concurrent 200

지표 하나라도 초과 → 다운 후 즉시 차단/제한. 권장 순서: 새 billing cycle 시작 직후 (모든 누적 카운터 reset 후) + 모든 지표 한도 내 확인 후 다운.

관련: [[supabase-image-transformations]] (사용 안 하면 raw object/public URL 서빙해서 transformation 쿼터 절감)
