'use client'

export function PrivacySettingsView() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm font-medium">데이터 내보내기</p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          모든 데이터를 JSON 형식으로 내보냅니다.
        </p>
        <button className="mt-3 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-bg-tertiary)]">
          내보내기
        </button>
      </div>
      <div className="rounded-xl border border-[var(--color-miss)]/20 bg-[var(--color-bg-secondary)] p-4">
        <p className="text-sm font-medium text-[var(--color-miss)]">계정 삭제</p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button className="mt-3 rounded-lg border border-[var(--color-miss)]/30 px-4 py-2 text-sm text-[var(--color-miss)] transition-colors hover:bg-[var(--color-danger-hover-bg)]">
          계정 삭제
        </button>
      </div>
    </div>
  )
}
