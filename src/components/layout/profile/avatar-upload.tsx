'use client'

import { useRef, useCallback } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import { useUpdateAvatar } from '@/queries/use-profile'

export function AvatarUpload({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null | undefined
  name: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateAvatar = useUpdateAvatar()

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('avatar', file)
      await updateAvatar.mutateAsync(formData)

      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [updateAvatar]
  )

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative mx-auto w-fit">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={updateAvatar.isPending}
        className="group relative h-20 w-20 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2"
        aria-label="프로필 사진 변경"
      >
        <div className="relative h-full w-full overflow-hidden rounded-full ring-1 ring-[var(--color-border)]">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--color-primary-100)] text-xl font-bold text-[var(--color-primary-600)]">
              {initials || '👤'}
            </div>
          )}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/15">
          <Camera className="h-5 w-5 text-white opacity-0 drop-shadow-sm transition-opacity group-hover:opacity-100" />
        </div>
        {updateAvatar.isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </button>
      {/* Camera badge — outside overflow so it protrudes beyond the circle */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-primary)] shadow-sm ring-2 ring-[var(--color-bg-primary)] transition-colors hover:bg-[var(--color-primary-100)]"
        aria-label="사진 업로드"
      >
        <Camera className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary-600)]" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
