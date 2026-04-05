# 쏟아내기 모드 시각적 전환 디자인

## Context

전구 버튼을 눌러 쏟아내기 모드에 진입할 때, 현재는 일반 채팅과 동일한 UI에서 context만 바뀜.
사용자가 "쏟아내기 모드에 들어왔다"는 느낌을 시각적으로 받을 수 있도록 풀 모드 전환을 구현한다.
또한 패널이 열리자마자 입력창에 자동 포커스되어 바로 타이핑 가능해야 한다.

## 핵심 요구사항

1. **전구 버튼 → 패널 열림 + 입력창 자동 포커스** (바로 타이핑 가능)
2. **풀 모드 시각 전환**: 헤더, 배경, 입력창, 빠른 액션 칩 모두 amber 테마로 통일
3. **모드 해제**: 헤더 X 버튼 → amber 테마 해제, 일반 채팅 UI로 복귀 (대화 내용 유지)
4. **사이드바**: 쏟아내기 모드에서도 그대로 유지

## 접근: 기존 AiChatPanel 내부 조건부 스타일링

새 컴포넌트를 만들지 않고, `context?.type === 'brain-dump'`일 때 스타일만 분기한다.

- 핵심이 "같은 채팅인데 분위기만 다르게"이므로 같은 컴포넌트에서 테마 분기가 적합
- 채팅 로직 중복 없음, 모드 전환이 `clearContext()`만으로 끝남

## 수정 대상 파일

| 파일                                              | 변경 내용                                      |
| ------------------------------------------------- | ---------------------------------------------- |
| `src/components/layout/ai-chat/ai-chat-panel.tsx` | 조건부 스타일링, 자동 포커스, 모드 해제 X 버튼 |
| `src/stores/ai-chat.store.ts`                     | 변경 없음 (기존 `clearContext()` 활용)         |
| `src/components/layout/ai-chat/chat-utils.ts`     | 변경 없음                                      |

## 상세 디자인

### 1. 헤더 전환

**일반 모드 (현재):**

```
🐾 동행 이누                    [+] [×]
```

**쏟아내기 모드:**

```
💡 쏟아내기              [×(모드해제)]  [+] [×]
─── amber 배경, amber-500 텍스트 ───
```

변경 사항:

- `context?.type === 'brain-dump'`일 때:
  - 헤더 배경: `bg-amber-50 dark:bg-amber-950/30`
  - 헤더 하단 보더: `border-amber-200 dark:border-amber-800`
  - 마스코트 아이콘 `🐾` → `Lightbulb` 아이콘 (amber-500)
  - 타이틀 `동행 이누` → `쏟아내기`
  - 모드 해제 X 버튼 추가 (amber-400 색상, 클릭 시 `clearContext()`)

### 2. 배경 전환

- 메시지 영역 배경: `bg-amber-50/30 dark:bg-amber-950/20` (은은한 amber tint)
- 빈 상태 인트로 텍스트 색상: `text-amber-700 dark:text-amber-300`

### 3. 입력창 전환

- 입력창 wrapper: `border-amber-200 dark:border-amber-800` (상단 보더)
- textarea placeholder: `"머릿속 이야기를 자유롭게..."` (쏟아내기 전용)
- 전송 버튼: `bg-amber-500 hover:bg-amber-600` (amber 톤)

### 4. 빠른 액션 칩 전환

- 칩 보더/텍스트: `border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300`
- 호버: `hover:bg-amber-100 dark:hover:bg-amber-900/40`

### 5. 자동 포커스

`openChatWithContext({ type: 'brain-dump' })` 호출 시 패널이 열리면 `inputRef.current?.focus()` 실행.

현재 `useEffect`가 `activeConversationId` 변경 시에만 포커스하므로, **context 변경 시에도 포커스**하도록 의존성 추가:

```typescript
useEffect(() => {
  inputRef.current?.focus()
}, [activeConversationId, context])
```

### 6. 모드 해제 흐름

1. 헤더의 쏟아내기 모드 X 버튼 클릭
2. `clearContext()` 호출
3. `context`가 `null`이 되면 모든 amber 스타일이 조건부로 해제
4. 대화 내용(`messages`)은 그대로 유지 — 일반 채팅으로 이어감

### 7. 구현 패턴

`isBrainDump` 플래그를 한 번 계산하고 전체에서 사용:

```typescript
const isBrainDump = context?.type === 'brain-dump'
```

각 섹션에서 `cn()` 유틸로 조건부 클래스 적용:

```typescript
// 헤더 예시
<div className={cn(
  "flex min-h-[45px] items-center justify-between border-b px-4 py-2",
  isBrainDump
    ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
    : "border-[var(--color-border)]"
)}>
```

## 시각적 정리

```
┌──────────────────────────────┐
│ 💡 쏟아내기           [×] [+]│  ← amber 헤더, × = 모드 해제
├──────────────────────────────┤
│                              │
│  (amber tint 배경)           │
│                              │
│  이누: 머릿속 이야기부터     │
│  그대로 꺼내주세요...        │
│                              │
│  [마음 정리] [시즌 정리]     │  ← amber 칩
│  [중요한 것 찾기]            │
│                              │
├──────────────────────────────┤
│ [머릿속 이야기를 자유롭게...] │  ← amber border, 자동 포커스
└──────────────────────────────┘
```

## 검증

1. 전구 버튼 클릭 → 패널 열림 + amber 테마 + 입력창 포커스 확인
2. 메시지 입력 → 일반 채팅과 동일하게 동작
3. 모드 해제 X 클릭 → amber 테마 해제 + 대화 내용 유지
4. 다크 모드에서 amber 색상 확인
5. `npm run lint` + `npm run type-check` 통과
