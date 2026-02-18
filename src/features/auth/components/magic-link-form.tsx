'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'

import { Button, Input, Label } from '@/components/ui'
import { signInWithMagicLink } from '@/actions/auth.actions'
import { magicLinkSchema, type MagicLinkSchema } from '@/lib/validations'
import { isApiSuccess } from '@/types'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

export function MagicLinkForm() {
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkSchema>({
    resolver: zodResolver(magicLinkSchema),
  })

  const onSubmit = async (data: MagicLinkSchema) => {
    const result = await signInWithMagicLink(data.email)

    if (isApiSuccess(result)) {
      trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN, { method: 'magic_link' })
      setSuccess(true)
      toast.success(result.data.message)
    } else {
      toast.error(result.error.message)
    }
  }

  if (success) {
    return (
      <div className="py-4 text-center">
        <div className="mb-2 text-3xl">📧</div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          로그인 링크를 발송했습니다.
          <br />
          이메일을 확인해주세요.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label htmlFor="magic-email" error={!!errors.email} className="sr-only">
          이메일
        </Label>
        <Input
          id="magic-email"
          type="email"
          placeholder="이메일로 로그인 링크 받기"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <Button type="submit" variant="secondary" className="w-full" isLoading={isSubmitting}>
        <Mail className="mr-2 h-4 w-4" />
        이메일 링크로 로그인
      </Button>
    </form>
  )
}
