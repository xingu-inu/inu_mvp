---
paths:
  - 'src/components/**'
---

# Component Rules

- UI 프리미티브 → components/ui/ (버튼, 인풋 등 범용)
- 도메인 컴포넌트 → components/common/ (task-card, streak-badge 등)
- Named export 사용 (default export는 page만)
- Radix UI 기반 + Tailwind CSS 4.0
- 터치 타겟 최소 44px (Apple HIG)
- 카드 높이: 64-80px
