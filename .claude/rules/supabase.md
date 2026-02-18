---
paths:
  - 'src/queries/**'
  - 'src/lib/supabase/**'
  - 'src/features/**/queries*'
---

# Supabase Rules

- 모든 쿼리에 loading/error 상태 처리 필수
- server component → createServerClient, client → createBrowserClient
- 생성된 타입 사용: src/types/database.ts
- 스키마 변경 후 `npm run db:types` 실행
