'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

import { Button, Input, Label, Checkbox } from '@/components/ui'
import { signUpWithEmail } from '@/actions/auth.actions'
import { signupSchema, type SignupSchema } from '@/lib/validations'
import { isApiSuccess } from '@/types'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: { agreeToTerms: false },
  })

  const onSubmit = async (data: SignupSchema) => {
    const result = await signUpWithEmail(
      data.email,
      data.password,
      data.confirmPassword,
      data.agreeToTerms
    )

    if (isApiSuccess(result)) {
      setSuccess(true)
      trackEvent(ANALYTICS_EVENTS.AUTH_SIGNUP, { method: 'email' })
      toast.success(result.data.message)
    } else {
      toast.error(result.error.message)
    }
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="mb-4 text-5xl">📧</div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
          이메일을 확인해주세요
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          인증 링크를 발송했습니다.
          <br />
          이메일을 확인하고 링크를 클릭해주세요.
        </p>
      </div>
    )
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email" error={!!errors.email}>
          이메일
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div>
        <Label htmlFor="password" error={!!errors.password}>
          비밀번호
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="8자 이상"
            autoComplete="new-password"
            error={errors.password?.message}
            className="pr-10"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="confirmPassword" error={!!errors.confirmPassword}>
          비밀번호 확인
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            placeholder="비밀번호를 다시 입력하세요"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            className="pr-10"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Controller
          name="agreeToTerms"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="agreeToTerms"
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              error={errors.agreeToTerms?.message}
              className="mt-0.5"
            />
          )}
        />
        <label
          htmlFor="agreeToTerms"
          className="text-sm leading-tight text-[var(--color-text-secondary)]"
        >
          <Link
            href="/terms"
            target="_blank"
            className="text-[var(--color-primary-500)] hover:underline"
          >
            이용약관
          </Link>
          {' 및 '}
          <Link
            href="/privacy"
            target="_blank"
            className="text-[var(--color-primary-500)] hover:underline"
          >
            개인정보처리방침
          </Link>
          에 동의합니다
        </label>
      </div>
      {errors.agreeToTerms && (
        <p className="text-sm text-[var(--color-miss)]">{errors.agreeToTerms.message}</p>
      )}

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
        가입하기
      </Button>
    </form>
  )
}
