# Phase 4.75: Landing & Authentication

> **Goal**: 사용자 진입점 구현 - Landing, Login, Signup, Password Reset 페이지

**예상 소요 시간**: 1.5 ~ 2일

---

## Reference Documents

- [Landing Spec](../plan/screens/landing/spec.md)
- [Landing Wireframe](../plan/screens/landing/wireframe.md)
- [Phase 3: Supabase](./phase-3-supabase.md) - Auth 설정
- [Phase 4.5: API Design](./phase-4.5-api-design.md) - Server Actions

---

## 4.75.1 Route Structure

```
app/
├── page.tsx                    # Landing (/) - 비로그인 사용자
├── (auth)/
│   ├── layout.tsx             # Auth layout (중앙 정렬, 네비게이션 없음)
│   ├── login/
│   │   └── page.tsx           # /login
│   ├── signup/
│   │   └── page.tsx           # /signup
│   └── forgot-password/
│       └── page.tsx           # /forgot-password
└── api/auth/
    └── callback/
        └── route.ts           # OAuth/Magic Link 콜백
```

---

## 4.75.2 Landing Page

### 목적

비로그인 사용자에게 inu의 가치를 전달하고 가입을 유도합니다.

### 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  Logo                                    [로그인] [시작하기]     │  ← Header
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     🎯 내 인생의 로드맵을                        │
│                     그리고, 매일 실천하세요                      │  ← Hero
│                                                                 │
│           목표는 있는데 실천이 안 되시나요?                      │
│           inu가 당신의 여정을 함께합니다.                        │
│                                                                 │
│                     [ 무료로 시작하기 ]                          │  ← CTA
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │ 🗺 로드맵    │  │ ✅ 원탭체크인 │  │ 🔥 스트릭   │            │  ← Features
│   │ 인생 전체를  │  │ 15초면      │  │ 습관을     │            │
│   │ 한눈에      │  │ 체크인 완료  │  │ 쌓아가세요  │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              ⭐ 수많은 목표 앱과 다른 점                         │  ← Differentiator
│                                                                 │
│   "목표만 세우고 끝나지 않습니다.                                │
│    왜 하는지, 어디로 가는지 항상 보여드립니다."                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                       가격 정책                                  │  ← Pricing
│                                                                 │
│   ┌─────────────────┐    ┌─────────────────┐                    │
│   │     무료        │    │      Pro        │                    │
│   │   ₩0/월        │    │  ₩3,900/월      │                    │
│   │                 │    │                 │                    │
│   │ • 핵심 기능 전부│    │ • AI 무제한     │                    │
│   │ • AI 1일 3회   │    │ • 상세 분석     │                    │
│   │                 │    │ • 우선 지원     │                    │
│   │  [무료 시작]    │    │  [Pro 시작]     │                    │
│   └─────────────────┘    └─────────────────┘                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  © 2024 inu · 개인정보처리방침 · 이용약관                        │  ← Footer
└─────────────────────────────────────────────────────────────────┘
```

### 구현

```typescript
// src/app/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LandingHero } from '@/features/landing/components/landing-hero';
import { LandingFeatures } from '@/features/landing/components/landing-features';
import { LandingPricing } from '@/features/landing/components/landing-pricing';
import { LandingHeader } from '@/features/landing/components/landing-header';
import { LandingFooter } from '@/features/landing/components/landing-footer';

export default async function LandingPage() {
  // 로그인한 사용자는 /today로 리다이렉트
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/today');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}
```

---

## 4.75.3 Auth Layout

인증 페이지 공통 레이아웃 - 중앙 정렬, 네비게이션 없음

```typescript
// src/app/(auth)/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이미 로그인한 사용자는 리다이렉트
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/today');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
```

---

## 4.75.4 Login Page

### 와이어프레임

```
┌─────────────────────────────────────────┐
│                                         │
│             🎯 inu                       │  ← Logo
│                                         │
│         다시 오신 걸 환영해요             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 이메일                           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 비밀번호                         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [        로그인        ]               │  ← Primary Button
│                                         │
│         비밀번호를 잊으셨나요?           │  ← Link
│                                         │
│  ─────────── 또는 ───────────           │  ← Divider
│                                         │
│  [  🔵 Google로 계속하기  ]             │  ← OAuth
│                                         │
│  [  ✉️ 이메일 링크로 로그인  ]           │  ← Magic Link
│                                         │
│                                         │
│         계정이 없으신가요? 회원가입       │  ← Link
│                                         │
└─────────────────────────────────────────┘
```

### 구현

```typescript
// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/features/auth/components/login-form';
import { OAuthButtons } from '@/features/auth/components/oauth-buttons';
import { MagicLinkForm } from '@/features/auth/components/magic-link-form';
import Link from 'next/link';

export const metadata = {
  title: '로그인 - inu',
  description: 'inu에 로그인하세요',
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">🎯 inu</h1>
        <p className="text-gray-600 mt-2">다시 오신 걸 환영해요</p>
      </div>

      {/* Email/Password Form */}
      <LoginForm />

      {/* Forgot Password Link */}
      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">또는</span>
        </div>
      </div>

      {/* OAuth & Magic Link */}
      <div className="space-y-3">
        <OAuthButtons />
        <MagicLinkForm />
      </div>

      {/* Signup Link */}
      <p className="text-center text-sm text-gray-600">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
```

---

## 4.75.5 Signup Page

### 와이어프레임

```
┌─────────────────────────────────────────┐
│                                         │
│             🎯 inu                       │
│                                         │
│       인생의 로드맵을 시작하세요          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 이메일                           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 비밀번호 (8자 이상)              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 비밀번호 확인                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ☐ 이용약관 및 개인정보처리방침에         │
│    동의합니다                            │
│                                         │
│  [        회원가입        ]              │
│                                         │
│  ─────────── 또는 ───────────           │
│                                         │
│  [  🔵 Google로 계속하기  ]              │
│                                         │
│                                         │
│         이미 계정이 있으신가요? 로그인    │
│                                         │
└─────────────────────────────────────────┘
```

### 구현

```typescript
// src/app/(auth)/signup/page.tsx
import { SignupForm } from '@/features/auth/components/signup-form';
import { OAuthButtons } from '@/features/auth/components/oauth-buttons';
import Link from 'next/link';

export const metadata = {
  title: '회원가입 - inu',
  description: 'inu에 가입하고 인생의 로드맵을 시작하세요',
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">🎯 inu</h1>
        <p className="text-gray-600 mt-2">인생의 로드맵을 시작하세요</p>
      </div>

      {/* Signup Form */}
      <SignupForm />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">또는</span>
        </div>
      </div>

      {/* OAuth */}
      <OAuthButtons />

      {/* Login Link */}
      <p className="text-center text-sm text-gray-600">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
```

---

## 4.75.6 Forgot Password Page

### 와이어프레임

```
┌─────────────────────────────────────────┐
│                                         │
│             🎯 inu                       │
│                                         │
│         비밀번호 재설정                  │
│                                         │
│  가입하신 이메일 주소를 입력하시면        │
│  비밀번호 재설정 링크를 보내드립니다.     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 이메일                           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [     재설정 링크 보내기     ]          │
│                                         │
│                                         │
│              ← 로그인으로 돌아가기        │
│                                         │
└─────────────────────────────────────────┘
```

### 구현

```typescript
// src/app/(auth)/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import Link from 'next/link';

export const metadata = {
  title: '비밀번호 재설정 - inu',
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">🎯 inu</h1>
        <p className="text-gray-600 mt-2">비밀번호 재설정</p>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center">
        가입하신 이메일 주소를 입력하시면<br />
        비밀번호 재설정 링크를 보내드립니다.
      </p>

      {/* Form */}
      <ForgotPasswordForm />

      {/* Back to Login */}
      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
```

---

## 4.75.7 Auth Actions

```typescript
// src/actions/auth.actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/api/response'
import { ErrorCode } from '@/lib/api/errors'
import type { ApiResponse } from '@/types/api'

// Email/Password 로그인
export async function signInWithEmail(
  email: string,
  password: string
): Promise<ApiResponse<{ redirectTo: string }>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return errorResponse(
          ErrorCode.AUTH_INVALID_TOKEN,
          '이메일 또는 비밀번호가 올바르지 않습니다.'
        )
      }
      return errorResponse(ErrorCode.AUTH_REQUIRED, error.message)
    }

    // 온보딩 완료 여부 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .single()

    const redirectTo = profile?.onboarding_completed ? '/today' : '/onboarding'

    revalidatePath('/', 'layout')
    return successResponse({ redirectTo })
  } catch (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, '로그인 중 오류가 발생했습니다.')
  }
}

// Email/Password 회원가입
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        return errorResponse(ErrorCode.ALREADY_EXISTS, '이미 가입된 이메일입니다.')
      }
      return errorResponse(ErrorCode.VALIDATION_ERROR, error.message)
    }

    return successResponse({
      message: '확인 이메일을 보냈습니다. 이메일을 확인해주세요.',
    })
  } catch (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, '회원가입 중 오류가 발생했습니다.')
  }
}

// Google OAuth 로그인 시작
export async function signInWithGoogle(): Promise<ApiResponse<{ url: string }>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      return errorResponse(ErrorCode.EXTERNAL_API_ERROR, 'Google 로그인을 시작할 수 없습니다.')
    }

    return successResponse({ url: data.url })
  } catch (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'OAuth 시작 중 오류가 발생했습니다.')
  }
}

// Magic Link 로그인
export async function signInWithMagicLink(
  email: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    })

    if (error) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, error.message)
    }

    return successResponse({
      message: '로그인 링크를 이메일로 보냈습니다. 이메일을 확인해주세요.',
    })
  } catch (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, '이메일 전송 중 오류가 발생했습니다.')
  }
}

// 비밀번호 재설정 요청
export async function resetPassword(email: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?type=recovery`,
    })

    if (error) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, error.message)
    }

    return successResponse({
      message: '비밀번호 재설정 링크를 이메일로 보냈습니다.',
    })
  } catch (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, '이메일 전송 중 오류가 발생했습니다.')
  }
}

// 로그아웃
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
```

---

## 4.75.8 Auth Components

### 컴포넌트 구조

```
src/features/auth/components/
├── login-form.tsx           # Email/Password 로그인 폼
├── signup-form.tsx          # 회원가입 폼
├── oauth-buttons.tsx        # Google OAuth 버튼
├── magic-link-form.tsx      # Magic Link 폼
├── forgot-password-form.tsx # 비밀번호 재설정 폼
└── auth-card.tsx            # 공통 카드 레이아웃
```

### Login Form

```typescript
// src/features/auth/components/login-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signInWithEmail } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    startTransition(async () => {
      const result = await signInWithEmail(data.email, data.password);

      if (result.success) {
        router.push(result.data.redirectTo);
      } else {
        toast.error(result.error.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  );
}
```

### OAuth Buttons

```typescript
// src/features/auth/components/oauth-buttons.tsx
'use client';

import { useTransition } from 'react';
import { signInWithGoogle } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function OAuthButtons() {
  const [isPending, startTransition] = useTransition();

  const handleGoogleLogin = () => {
    startTransition(async () => {
      const result = await signInWithGoogle();

      if (result.success) {
        // OAuth URL로 리다이렉트
        window.location.href = result.data.url;
      } else {
        toast.error(result.error.message);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleLogin}
      disabled={isPending}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        {/* Google Icon SVG */}
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isPending ? '연결 중...' : 'Google로 계속하기'}
    </Button>
  );
}
```

### Signup Form

```typescript
// src/features/auth/components/signup-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { signUpWithEmail } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

const signupSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: '이용약관에 동의해주세요',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      agreeToTerms: false,
    },
  });

  const agreeToTerms = watch('agreeToTerms');

  const onSubmit = (data: SignupFormData) => {
    startTransition(async () => {
      const result = await signUpWithEmail(data.email, data.password);

      if (result.success) {
        setIsSuccess(true);
        toast.success(result.data.message);
      } else {
        toast.error(result.error.message);
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-lg font-semibold mb-2">이메일을 확인해주세요</h2>
        <p className="text-sm text-gray-600">
          확인 링크를 클릭하면 가입이 완료됩니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="8자 이상"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="비밀번호 확인"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="agreeToTerms"
          checked={agreeToTerms}
          onCheckedChange={(checked) => setValue('agreeToTerms', checked as boolean)}
        />
        <label htmlFor="agreeToTerms" className="text-sm text-gray-600 leading-tight">
          <Link href="/terms" className="text-primary hover:underline">이용약관</Link>
          {' '}및{' '}
          <Link href="/privacy" className="text-primary hover:underline">개인정보처리방침</Link>
          에 동의합니다
        </label>
      </div>
      {errors.agreeToTerms && (
        <p className="text-sm text-red-500">{errors.agreeToTerms.message}</p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? '가입 중...' : '회원가입'}
      </Button>
    </form>
  );
}
```

---

## 4.75.9 Auth Callback Route

OAuth 및 Magic Link 콜백 처리

```typescript
// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/today'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // 에러 시 로그인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin))
    }

    // Password Recovery인 경우
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/reset-password', requestUrl.origin))
    }

    // 온보딩 완료 여부 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .single()

    const redirectTo = profile?.onboarding_completed ? next : '/onboarding'
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
  }

  // code가 없으면 홈으로 리다이렉트
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
```

---

## 4.75.10 Environment Variables

```bash
# .env.local

# Site URL (로컬 개발)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth (Supabase Dashboard에서 설정)
# - Supabase > Authentication > Providers > Google
```

---

## Completion Checklist

- [ ] **Landing 페이지 구현**
  - [ ] Header (Logo, Login/Signup 버튼)
  - [ ] Hero 섹션
  - [ ] Features 섹션
  - [ ] Pricing 섹션
  - [ ] Footer
  - [ ] 로그인 사용자 리다이렉트

- [ ] **Auth Layout**
  - [ ] 중앙 정렬 레이아웃
  - [ ] 로그인 사용자 리다이렉트

- [ ] **Login 페이지**
  - [ ] Email/Password 폼
  - [ ] Google OAuth 버튼
  - [ ] Magic Link 옵션
  - [ ] 비밀번호 찾기 링크
  - [ ] 회원가입 링크

- [ ] **Signup 페이지**
  - [ ] Email/Password 폼
  - [ ] 비밀번호 확인
  - [ ] 이용약관 동의
  - [ ] Google OAuth 버튼
  - [ ] 로그인 링크
  - [ ] 이메일 확인 안내

- [ ] **Forgot Password 페이지**
  - [ ] 이메일 입력 폼
  - [ ] 로그인 링크

- [ ] **Auth Actions**
  - [ ] signInWithEmail
  - [ ] signUpWithEmail
  - [ ] signInWithGoogle
  - [ ] signInWithMagicLink
  - [ ] resetPassword
  - [ ] signOut

- [ ] **Auth Callback Route**
  - [ ] OAuth 콜백 처리
  - [ ] Magic Link 콜백 처리
  - [ ] Password Recovery 처리

- [ ] **E2E Test**
  - [ ] 회원가입 → 이메일 확인 → 온보딩 플로우
  - [ ] 로그인 → Today 리다이렉트

---

## 🔗 Navigation

← [Phase 4.5: API Design & Server Actions](./phase-4.5-api-design.md)
→ [Phase 5: Onboarding Flow](./phase-5-onboarding.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
