---
name: verify-completion
description: 작업 완료 주장 전에 반드시 증거 확인 — 증거 없이 완료 주장 금지
---

# Verification Before Completion

## Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

이 메시지에서 검증 명령을 실행하지 않았다면, 통과한다고 주장할 수 없음.

## The Gate Function

```
완료/성공 주장 전에:

1. IDENTIFY: 이 주장을 증명하는 명령어는?
2. RUN: 전체 명령어 실행 (fresh, complete)
3. READ: 전체 출력, exit code, 실패 수 확인
4. VERIFY: 출력이 주장을 확인하는가?
   - NO → 실제 상태를 증거와 함께 보고
   - YES → 증거와 함께 주장
5. ONLY THEN: 주장

어떤 단계든 건너뛰기 = 거짓말
```

## 프로젝트 검증 명령어

```bash
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run test          # Vitest
npm run build         # Next.js build
```

## Common Failures

| 주장          | 필요한 증거                    | 불충분한 것                 |
| ------------- | ------------------------------ | --------------------------- |
| 테스트 통과   | 테스트 명령어 출력: 0 failures | 이전 실행, "될 거야"        |
| 린트 클린     | 린터 출력: 0 errors            | 부분 체크, 추정             |
| 빌드 성공     | 빌드 명령어: exit 0            | 린터 통과, 로그 괜찮아 보임 |
| 버그 수정됨   | 원래 증상 테스트: 통과         | 코드 변경됨, 수정 추정      |
| 요구사항 충족 | 항목별 체크리스트              | 테스트만 통과               |

## Red Flags — STOP

- "될 거야", "아마", "~인 것 같다" 사용
- 검증 전 만족 표현 ("완료!", "해결!", "끝!")
- 커밋/푸시/PR 전에 검증 안 함
- 부분 검증에 의존
- "이번만 괜찮겠지"
- **성공을 암시하는 어떤 표현이든 검증 없이 사용**

## Key Patterns

**테스트:**

```
OK: [테스트 실행] [34/34 pass 확인] "전체 테스트 통과"
NO: "이제 될 거야" / "맞아 보이는데"
```

**빌드:**

```
OK: [빌드 실행] [exit 0 확인] "빌드 통과"
NO: "린터 통과했으니까" (린터 ≠ 컴파일러)
```

**요구사항:**

```
OK: 플랜 재확인 → 체크리스트 생성 → 각 항목 검증 → 갭 또는 완료 보고
NO: "테스트 통과했으니 완료"
```

## Rationalization Prevention

| 합리화               | 현실                            |
| -------------------- | ------------------------------- |
| "이제 될 거야"       | 검증 명령 실행하라              |
| "확신해"             | 확신 ≠ 증거                     |
| "이번만"             | 예외 없음                       |
| "린터 통과"          | 린터 ≠ 타입체커 ≠ 테스트 ≠ 빌드 |
| "피곤해서"           | 피곤함 ≠ 면제                   |
| "부분 확인이면 충분" | 부분은 아무것도 증명 못함       |

## The Bottom Line

**"명령어 실행. 출력 읽기. 그 다음 주장."**

Non-negotiable.
