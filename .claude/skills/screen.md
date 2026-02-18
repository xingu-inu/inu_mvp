---
name: screen
description: Implement or modify a screen based on its spec and wireframe docs
---

화면 $ARGUMENTS 구현/수정:

1. `docs/plan/screens/$ARGUMENTS/spec.md`와 `wireframe.md` 읽기
2. 기존 구현 확인 (src/app/ 하위 관련 경로)
3. 관련 컴포넌트 확인 (src/components/common/)
4. 데이터 모델 참조: @docs/plan/core/data-model.md
5. 구현
6. `npm run lint && npm run type-check` 실행
