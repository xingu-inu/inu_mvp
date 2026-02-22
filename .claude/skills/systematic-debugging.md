---
name: systematic-debugging
description: 버그, 테스트 실패, 예상치 못한 동작 발견 시 — 수정 전에 반드시 근본 원인부터 찾기
---

# Systematic Debugging

## Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Random fixes waste time and create new bugs. **Phase 1 완료 전에는 수정 제안 금지.**

## When to Use

- 테스트 실패, 프로덕션 버그, 예상치 못한 동작
- 성능 문제, 빌드 실패, 통합 이슈
- **특히:** 시간 압박, "빠른 수정" 유혹, 이미 여러 수정 시도 후

## The Four Phases

각 Phase를 완료해야 다음 Phase로 진행 가능.

### Phase 1: Root Cause Investigation

**수정 시도 전에 반드시:**

1. **에러 메시지 정독** — 스택 트레이스 전체, 라인 넘버, 에러 코드
2. **재현 확인** — 정확한 재현 단계, 매번 발생하는지 확인
3. **최근 변경 확인** — `git diff`, 최근 커밋, 의존성/설정 변경
4. **멀티 컴포넌트 시스템 진단:**
   ```
   각 컴포넌트 경계마다:
     - 들어오는 데이터 로깅
     - 나가는 데이터 로깅
     - 환경/설정 전파 확인
   → 한 번 실행해서 어디서 깨지는지 증거 수집
   → 그 다음 해당 컴포넌트만 조사
   ```
5. **데이터 흐름 추적 (Root Cause Tracing):**
   - 잘못된 값이 어디서 시작되는지?
   - 누가 이 잘못된 값을 전달했는지?
   - 소스를 찾을 때까지 콜스택을 역추적
   - **증상이 아닌 소스에서 수정**

### Phase 2: Pattern Analysis

1. **동작하는 유사 코드 찾기** — 같은 코드베이스에서
2. **레퍼런스 구현 완전히 읽기** — 훑어보기 금지, 모든 줄 이해
3. **차이점 식별** — 아무리 작아도 "그건 상관없겠지" 가정 금지
4. **의존성 파악** — 필요한 컴포넌트, 설정, 환경, 전제조건

### Phase 3: Hypothesis & Testing

1. **단일 가설 수립** — "X가 근본 원인이다. 왜냐하면 Y"
2. **최소 변경으로 테스트** — 한 번에 하나의 변수만
3. **검증 후 진행** — 성공 → Phase 4 / 실패 → 새 가설 (기존 수정 위에 추가 금지)
4. **모르면 모른다고 말하기** — 추측하지 않고 추가 조사

### Phase 4: Implementation

1. **실패하는 테스트 케이스 작성** (Vitest)
2. **단일 수정 구현** — 근본 원인만 해결, "여기 온 김에" 개선 금지
3. **수정 검증** — `npm run test && npm run type-check`
4. **수정 3회 실패 시:**
   - STOP — 아키텍처 문제 의심
   - 각 수정이 다른 곳에서 새 문제를 만든다면 패턴 자체가 잘못됨
   - 유저와 논의 후 진행

## Defense-in-Depth

근본 원인 수정 후, 같은 버그가 구조적으로 불가능하도록 다중 레이어 검증 추가:

| Layer                 | 목적                             | 예시                                |
| --------------------- | -------------------------------- | ----------------------------------- |
| Entry Point           | 잘못된 입력 즉시 거부            | API 경계에서 validation             |
| Business Logic        | 해당 연산에 데이터가 유효한지    | 서비스 레이어 검증                  |
| Environment Guard     | 특정 컨텍스트에서 위험 연산 방지 | test 환경에서 프로덕션 DB 접근 차단 |
| Debug Instrumentation | 포렌식 컨텍스트 캡처             | 위험 연산 전 로깅                   |

## Condition-Based Waiting (비동기 테스트)

```typescript
// BAD: 타이밍 추측
await new Promise((r) => setTimeout(r, 50))

// GOOD: 조건 대기
await waitFor(() => getResult() !== undefined)
```

임의의 `setTimeout`/`sleep` 대신 실제 조건이 충족될 때까지 폴링.

## Red Flags — STOP and Return to Phase 1

- "일단 X 바꿔보고 되는지 보자"
- "빠른 수정만 하고 나중에 조사하자"
- "여러 변경 한번에 넣고 테스트"
- "테스트 건너뛰고 수동 확인"
- "아마 X일 거야, 고치자"
- 데이터 흐름 추적 없이 솔루션 제안
- **수정 2회 이상 실패 후 "한 번만 더"**

## Quick Reference

| Phase             | 핵심 활동                             | 성공 기준              |
| ----------------- | ------------------------------------- | ---------------------- |
| 1. Root Cause     | 에러 정독, 재현, 변경 확인, 증거 수집 | WHAT과 WHY 이해        |
| 2. Pattern        | 동작 예시 찾기, 비교                  | 차이점 식별            |
| 3. Hypothesis     | 가설 수립, 최소 테스트                | 확인 또는 새 가설      |
| 4. Implementation | 테스트 작성, 수정, 검증               | 버그 해결, 테스트 통과 |

## Impact

- Systematic: 15-30분 해결 / Random fixes: 2-3시간 삽질
- First-time fix rate: 95% vs 40%
- 새 버그 발생: 거의 0 vs 빈번
