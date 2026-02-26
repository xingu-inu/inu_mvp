'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

import { Button, Input, Label } from '@/components/ui'
import { signInWithEmail } from '@/actions/auth.actions'
import { loginSchema, type LoginSchema } from '@/lib/validations'
import { isApiSuccess } from '@/types'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginSchema) => {
    const result = await signInWithEmail(data.email, data.password)

    if (isApiSuccess(result)) {
      trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN, { method: 'email' })
      // 풀 페이지 이동 — 라우터 캐시(DemoApp 등)를 우회하고 미들웨어가 신선하게 처리하도록
      window.location.replace(result.data.redirectTo)
    } else {
      toast.error(result.error.message)
    }
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
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
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

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
        로그인
      </Button>
    </form>
  )
}
