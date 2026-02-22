---
name: tdd
description: 기능 구현, 버그 수정 전에 테스트 먼저 작성 — RED-GREEN-REFACTOR 사이클
---

# Test-Driven Development (TDD)

## Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

테스트 전에 코드를 썼다면? **삭제하고 다시 시작.** 참고용으로 남기는 것도 금지.

## When to Use

**항상:** 새 기능, 버그 수정, 리팩토링, 동작 변경
**예외 (유저 승인 필요):** throwaway 프로토타입, 생성 코드, 설정 파일

## Red-Green-Refactor

### RED — 실패하는 테스트 작성

하나의 최소 테스트. 무엇이 일어나야 하는지를 보여줌.

```typescript
// GOOD: 명확한 이름, 실제 동작 테스트, 하나만
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' })
  expect(result.error).toBe('Email required')
})

// BAD: 모호한 이름, mock 테스트
test('validation works', () => {
  const mock = vi.fn().mockReturnValue(false)
  expect(mock()).toBe(false)
})
```

**요건:** 하나의 동작, 명확한 이름, real code (mock은 불가피할 때만)

### Verify RED — 실패 확인

**필수. 절대 건너뛰지 않음.**

```bash
npx vitest run path/to/test.test.ts
```

확인 사항:

- 테스트가 실패하는가 (에러가 아닌 실패)
- 실패 메시지가 예상한 것인가
- 기능이 없어서 실패하는가 (오타 아님)

**테스트가 통과한다면?** 이미 존재하는 동작을 테스트 중. 테스트 수정.

### GREEN — 최소 코드

테스트를 통과시키는 가장 간단한 코드.

```typescript
// GOOD: 테스트 통과에 딱 필요한 만큼
function submitForm(data: FormData) {
  if (!data.email?.trim()) {
    return { error: 'Email required' }
  }
  // ...
}

// BAD: 과도한 엔지니어링 (YAGNI)
function submitForm(
  data: FormData,
  options?: {
    maxRetries?: number
    onError?: (e: Error) => void
  }
) {
  /* ... */
}
```

기능 추가, 다른 코드 리팩토링, 테스트 범위 넘어서는 "개선" 금지.

### Verify GREEN — 통과 확인

**필수.**

```bash
npx vitest run path/to/test.test.ts
```

- 테스트 통과하는가?
- 다른 테스트도 여전히 통과하는가?
- 출력에 에러/경고 없는가?

**테스트 실패?** 코드 수정 (테스트 수정 아님). **다른 테스트 실패?** 지금 수정.

### REFACTOR — 정리

GREEN 이후에만:

- 중복 제거, 이름 개선, 헬퍼 추출
- 테스트는 계속 GREEN 유지. 동작 추가 금지.

### Repeat

다음 기능을 위한 다음 실패 테스트.

## 프로젝트 도구

| 도구                   | 용도                    | 명령어             |
| ---------------------- | ----------------------- | ------------------ |
| Vitest                 | Unit/Integration 테스트 | `npx vitest run`   |
| @testing-library/react | 컴포넌트 테스트         | Vitest와 함께      |
| Playwright             | E2E 테스트              | `npm run test:e2e` |

## Common Rationalizations

| 합리화                        | 현실                                             |
| ----------------------------- | ------------------------------------------------ |
| "너무 간단해서 테스트 불필요" | 간단한 코드도 깨짐. 테스트 30초.                 |
| "나중에 테스트 쓸게"          | 즉시 통과하는 테스트는 아무것도 증명 못함        |
| "이미 수동 테스트 했어"       | Ad-hoc ≠ systematic. 기록 없고 재실행 불가       |
| "X시간 작업 삭제하긴 아까워"  | Sunk cost fallacy. 검증 안 된 코드가 진짜 낭비   |
| "TDD는 교조적"                | TDD IS pragmatic. 디버깅보다 빠름                |
| "참고용으로 남기자"           | 참고하면 결국 adapt하게 됨. Delete means delete. |
| "탐색 먼저 해야 해"           | 탐색 OK. 버리고 TDD로 새로 시작.                 |

## Red Flags — STOP and Start Over

- 테스트 전에 코드 작성
- 구현 후 테스트 추가
- 테스트가 즉시 통과
- 왜 테스트가 실패했는지 설명 불가
- "이번만 건너뛰자"
- "참고용으로 유지"

**이 모든 것 = 코드 삭제. TDD로 재시작.**

## Verification Checklist

작업 완료 전:

- [ ] 모든 새 함수/메서드에 테스트 있음
- [ ] 각 테스트가 실패하는 것을 확인함
- [ ] 예상한 이유로 실패함 (기능 미구현, 오타 아님)
- [ ] 각 테스트 통과시키는 최소 코드 작성
- [ ] 전체 테스트 통과
- [ ] 출력 깨끗 (에러/경고 없음)
- [ ] 테스트는 real code 사용 (mock은 불가피할 때만)
- [ ] 엣지 케이스와 에러 케이스 커버

모든 체크 불가? TDD를 건너뛴 것. 다시 시작.
