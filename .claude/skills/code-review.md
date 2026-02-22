---
name: code-review
description: 코드 리뷰 요청 및 피드백 수용 — 기술적 검증 후 구현, 맹목 동의 금지
---

# Code Review

## Part 1: Requesting Review

### When to Request

**필수:** 주요 기능 완료 후, main 머지 전
**선택:** 막힐 때 (fresh perspective), 리팩토링 전 (baseline), 복잡한 버그 수정 후

### How to Request

1. **Git diff 준비:**

   ```bash
   git diff main...HEAD
   ```

2. **Context 제공:**
   - 무엇을 구현했는지
   - 어떤 요구사항/플랜 기반인지
   - 변경 범위 (파일 수, 주요 변경점)

3. **피드백 대응:**
   - Critical → 즉시 수정
   - Important → 진행 전 수정
   - Minor → 나중에 수정 가능
   - 리뷰어가 틀렸다면 → 기술적 근거로 반박

---

## Part 2: Receiving Review

### The Response Pattern

```
피드백 수신 시:

1. READ: 전체 피드백을 반응 없이 읽기
2. UNDERSTAND: 요구사항을 자기 말로 재진술 (또는 질문)
3. VERIFY: 코드베이스 현실과 대조 확인
4. EVALUATE: 이 코드베이스에 기술적으로 맞는가?
5. RESPOND: 기술적 인정 또는 근거 있는 반박
6. IMPLEMENT: 하나씩 구현, 각각 테스트
```

### Forbidden Responses

**금지:**

- "맞아요!", "좋은 지적!", "훌륭한 피드백!"
- 검증 전 "바로 구현할게요"

**대신:**

- 기술적 요구사항 재진술
- 명확화 질문
- 틀렸다면 기술적 근거로 반박
- 바로 작업 시작 (행동 > 말)

### Unclear Feedback

```
불명확한 항목이 있으면:
  STOP — 아무것도 구현하지 않음
  불명확한 항목에 대해 질문

이유: 항목들이 연관될 수 있음. 부분 이해 = 잘못된 구현.
```

### External Review Handling

외부 리뷰어 피드백 구현 전:

1. 이 코드베이스에 기술적으로 맞는가?
2. 기존 기능을 깨뜨리는가?
3. 현재 구현의 이유가 있는가?
4. 모든 플랫폼/버전에서 동작하는가?

### YAGNI Check

```
리뷰어가 "제대로 구현" 제안 시:
  코드베이스에서 실제 사용처 검색

  사용 안 됨 → "이 기능 사용처 없음. 제거? (YAGNI)"
  사용 됨 → 제대로 구현
```

### Implementation Order

멀티 항목 피드백:

1. 불명확한 것 먼저 질문
2. 구현 순서:
   - Blocking (깨짐, 보안)
   - Simple (오타, import)
   - Complex (리팩토링, 로직)
3. 각 수정 개별 테스트
4. 리그레션 없는지 확인

### When to Push Back

반박할 때:

- 기존 기능을 깨뜨림
- 리뷰어가 전체 컨텍스트를 모름
- YAGNI 위반 (미사용 기능)
- 이 스택에 기술적으로 부적합
- 아키텍처 결정과 충돌

**방법:** 기술적 근거, 방어적 태도 아님, 구체적 질문, 동작하는 테스트/코드 참조

### Acknowledging Correct Feedback

```
OK: "수정함. [변경 내용 간단 설명]"
OK: [바로 수정하고 코드로 보여주기]

NO: "맞아요!", "좋은 지적!", "감사합니다!"
```

행동이 말보다 낫다. 수정하면 됨.
