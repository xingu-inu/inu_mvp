'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button, Input, Label } from '@/components/ui'
import { resetPassword } from '@/actions/auth.actions'
import { forgotPasswordSchema, type ForgotPasswordSchema } from '@/lib/validations'
import { isApiSuccess } from '@/types'

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordSchema) => {
    const result = await resetPassword(data.email)

    if (isApiSuccess(result)) {
      setSuccess(true)
      toast.success(result.data.message)
    } else {
      toast.error(result.error.message)
    }
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="mb-4 text-5xl">📧</div>
        <h2 className="mb-2 text-xl font-semibold">이메일을 확인해주세요</h2>
        <p className="text-[var(--color-text-secondary)]">비밀번호 재설정 링크를 발송했습니다.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        가입하신 이메일을 입력하시면 비밀번호 재설정 링크를 보내드려요
      </p>

      <div>
        <Label htmlFor="reset-email" error={!!errors.email}>
          이메일
        </Label>
        <Input
          id="reset-email"
          type="email"
          placeholder="email@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
        재설정 링크 보내기
      </Button>
    </form>
  )
}
