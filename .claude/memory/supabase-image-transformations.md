---
name: supabase-image-transformations
description: Supabase Storage 의 /render/image 엔드포인트는 transformation 쿼터 소모. 미리 압축 후 raw /object/public URL 서빙하면 쿼터 0
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5f5bb457-a6ab-408c-bd89-2096053c5295
---

Supabase Storage 이미지 서빙 두 경로:
- `/storage/v1/object/public/<bucket>/<path>` → raw 파일, transformation 쿼터 **미소모**
- `/storage/v1/render/image/public/<bucket>/<path>?width=X&quality=Y` → 변환, 쿼터 **소모** (Free 100/월, Pro 100 + overage 청구)

**현재 정책**: 업로드 시점에 client compress (`compressImage` in [run-log-form.tsx](src/presentation/components/form/run-log-form.tsx) 1200px/q0.82, `cropImageToBlob` in [avatar-crop-modal.tsx](src/presentation/components/profile/avatar-crop-modal.tsx) 400x400/q0.9). 디스플레이 시 [image-url.ts](src/infrastructure/supabase/image-url.ts) `toTransformedUrl` 가 raw URL 그대로 반환 (no-op).

**Why**: 2026-06 기준 Pro 한도 100/월 의 208% 초과 (Pro 결제 사이클당 transformation 카운트 누적). 매월 청구 폭증.

**How to apply**: 새 이미지 표시 경로 추가 시 `toTransformedUrl` 만 거치면 됨 (caller-side 코드 변경 불필요). 절대 `/render/image/` 직접 호출 X. 새 업로드 경로 추가 시 client 측에서 미리 max width 압축 필수 (canvas + `createImageBitmap({ imageOrientation: 'from-image' })` 패턴 사용 — EXIF orientation 반영).
