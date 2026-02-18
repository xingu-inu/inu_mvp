'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
      router.push(result.data.redirectTo)
    } else {
      toast.error(result.error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email" error={!!errors.email}>
          이메일
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
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
