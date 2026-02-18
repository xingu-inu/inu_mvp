# Phase 5: Onboarding Flow

> **Goal**: Implement multi-step onboarding experience for new users

---

## 📚 Reference Documents

- `docs/plan/screens/onboarding/spec.md`
- `docs/plan/screens/onboarding/wireframe.md`
- `docs/plan/core/philosophy.md` (Personas, target users)
- `docs/plan/reference/features/why-chain.md`

---

## 5.1 Onboarding Store (Zustand)

### src/stores/onboarding.store.ts

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreateAreaInput, CreateGoalInput } from '@/types/entities'

export type OnboardingStep =
  | 'welcome'
  | 'values'
  | 'direction'
  | 'areas'
  | 'first-goal'
  | 'complete'

interface OnboardingState {
  currentStep: OnboardingStep

  // Collected data
  selectedValues: string[]
  direction: string
  directionWhy: string
  selectedAreas: CreateAreaInput[]
  firstGoal: CreateGoalInput | null

  // Actions
  setStep: (step: OnboardingStep) => void
  nextStep: () => void
  prevStep: () => void

  setValues: (values: string[]) => void
  setDirection: (statement: string, why: string) => void
  setAreas: (areas: CreateAreaInput[]) => void
  setFirstGoal: (goal: CreateGoalInput) => void

  reset: () => void
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'values',
  'direction',
  'areas',
  'first-goal',
  'complete',
]

const initialState = {
  currentStep: 'welcome' as OnboardingStep,
  selectedValues: [],
  direction: '',
  directionWhy: '',
  selectedAreas: [],
  firstGoal: null,
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().currentStep)
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[currentIndex + 1] })
        }
      },

      prevStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().currentStep)
        if (currentIndex > 0) {
          set({ currentStep: STEP_ORDER[currentIndex - 1] })
        }
      },

      setValues: (values) => set({ selectedValues: values }),
      setDirection: (statement, why) => set({ direction: statement, directionWhy: why }),
      setAreas: (areas) => set({ selectedAreas: areas }),
      setFirstGoal: (goal) => set({ firstGoal: goal }),

      reset: () => set(initialState),
    }),
    {
      name: 'onboarding-storage',
    }
  )
)
```

---

## 5.2 Onboarding Page Structure

### src/app/onboarding/page.tsx

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { WelcomeStep } from '@/features/onboarding/steps/welcome-step'
import { ValuesStep } from '@/features/onboarding/steps/values-step'
import { DirectionStep } from '@/features/onboarding/steps/direction-step'
import { AreasStep } from '@/features/onboarding/steps/areas-step'
import { FirstGoalStep } from '@/features/onboarding/steps/first-goal-step'
import { CompleteStep } from '@/features/onboarding/steps/complete-step'
import { StepIndicator } from '@/features/onboarding/components/step-indicator'

export default function OnboardingPage() {
  const router = useRouter()
  const { currentStep } = useOnboardingStore()

  const stepComponents = {
    welcome: WelcomeStep,
    values: ValuesStep,
    direction: DirectionStep,
    areas: AreasStep,
    'first-goal': FirstGoalStep,
    complete: CompleteStep,
  }

  const CurrentStepComponent = stepComponents[currentStep]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Step Indicator (hidden on welcome and complete) */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <div className="py-4">
          <StepIndicator />
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 flex flex-col">
        <CurrentStepComponent />
      </div>
    </div>
  )
}
```

---

## 5.3 Step Indicator Component

### src/features/onboarding/components/step-indicator.tsx

```typescript
'use client'

import { useOnboardingStore, OnboardingStep } from '@/stores/onboarding.store'
import { cn } from '@/lib/utils'

const VISIBLE_STEPS: { step: OnboardingStep; label: string }[] = [
  { step: 'values', label: 'Values' },
  { step: 'direction', label: 'Direction' },
  { step: 'areas', label: 'Areas' },
  { step: 'first-goal', label: 'Goal' },
]

export function StepIndicator() {
  const { currentStep } = useOnboardingStore()

  const currentIndex = VISIBLE_STEPS.findIndex((s) => s.step === currentStep)

  return (
    <div className="flex items-center justify-center gap-2">
      {VISIBLE_STEPS.map((item, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={item.step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  isCompleted && 'bg-done text-white',
                  isCurrent && 'bg-primary-500 text-white',
                  !isCompleted && !isCurrent && 'bg-surface-tertiary text-foreground-tertiary'
                )}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className={cn(
                  'text-xs mt-1',
                  isCurrent ? 'text-foreground font-medium' : 'text-foreground-tertiary'
                )}
              >
                {item.label}
              </span>
            </div>

            {index < VISIBLE_STEPS.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-2 mb-4',
                  isCompleted ? 'bg-done' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

---

## 5.4 Step Components

### src/features/onboarding/steps/welcome-step.tsx

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding.store'

export function WelcomeStep() {
  const { nextStep } = useOnboardingStore()

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      {/* Logo */}
      <h1 className="text-5xl font-extrabold text-primary-500 mb-4">inu</h1>

      {/* Tagline */}
      <p className="text-xl text-foreground mb-2">
        Your Life Roadmap Companion
      </p>
      <p className="text-foreground-secondary mb-12 max-w-sm">
        Create your life roadmap and manage goals within your time.
        Let&apos;s start by understanding what matters most to you.
      </p>

      {/* CTA */}
      <Button size="lg" onClick={nextStep} className="w-full max-w-xs">
        Get Started
      </Button>

      {/* Already have account */}
      <p className="mt-6 text-sm text-foreground-tertiary">
        Already have an account?{' '}
        <a href="/login" className="text-primary-500 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  )
}
```

### src/features/onboarding/steps/values-step.tsx

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { useOnboardingStore } from '@/stores/onboarding.store'

const VALUE_OPTIONS = [
  { id: 'health', label: 'Health & Wellness', emoji: '💪' },
  { id: 'career', label: 'Career Growth', emoji: '📈' },
  { id: 'finance', label: 'Financial Freedom', emoji: '💰' },
  { id: 'relationships', label: 'Relationships', emoji: '❤️' },
  { id: 'creativity', label: 'Creativity', emoji: '🎨' },
  { id: 'learning', label: 'Learning', emoji: '📚' },
  { id: 'adventure', label: 'Adventure', emoji: '🌍' },
  { id: 'peace', label: 'Inner Peace', emoji: '🧘' },
  { id: 'impact', label: 'Making Impact', emoji: '🌟' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { id: 'freedom', label: 'Freedom', emoji: '🦅' },
  { id: 'balance', label: 'Work-Life Balance', emoji: '⚖️' },
]

export function ValuesStep() {
  const { selectedValues, setValues, nextStep, prevStep } = useOnboardingStore()
  const [selected, setSelected] = useState<string[]>(selectedValues)

  const toggleValue = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((v) => v !== id))
    } else if (selected.length < 3) {
      setSelected([...selected, id])
    }
  }

  const handleNext = () => {
    setValues(selected)
    nextStep()
  }

  return (
    <div className="flex-1 flex flex-col px-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">What matters most to you?</h2>
        <p className="text-foreground-secondary">
          Select up to 3 values that guide your life decisions.
        </p>
      </div>

      {/* Value Grid */}
      <div className="flex-1">
        <div className="flex flex-wrap gap-3">
          {VALUE_OPTIONS.map((value) => (
            <Chip
              key={value.id}
              variant="selection"
              selected={selected.includes(value.id)}
              onClick={() => toggleValue(value.id)}
              emoji={value.emoji}
            >
              {value.label}
            </Chip>
          ))}
        </div>

        <p className="mt-4 text-sm text-foreground-tertiary">
          {selected.length}/3 selected
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 py-6">
        <Button variant="secondary" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button onClick={handleNext} disabled={selected.length === 0} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

### src/features/onboarding/steps/direction-step.tsx

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useOnboardingStore } from '@/stores/onboarding.store'

export function DirectionStep() {
  const { direction, directionWhy, setDirection, nextStep, prevStep } = useOnboardingStore()
  const [statement, setStatement] = useState(direction)
  const [why, setWhy] = useState(directionWhy)

  const handleNext = () => {
    setDirection(statement, why)
    nextStep()
  }

  return (
    <div className="flex-1 flex flex-col px-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Define your life direction</h2>
        <p className="text-foreground-secondary">
          In one sentence, describe where you want your life to go.
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            My life direction is...
          </label>
          <Textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="e.g., To build a fulfilling career while maintaining health and strong relationships"
            className="min-h-[100px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Why is this important to you? (optional)
          </label>
          <Textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="e.g., I've realized that success means nothing without health and people I love"
            className="min-h-[100px]"
          />
        </div>

        {/* Tips */}
        <div className="p-4 rounded-lg bg-ai-bg/50 border border-ai/20">
          <p className="text-sm text-ai font-medium mb-2">💡 Tips for a good direction:</p>
          <ul className="text-sm text-foreground-secondary space-y-1">
            <li>• Be specific but flexible</li>
            <li>• Focus on what you want, not what you want to avoid</li>
            <li>• Include multiple life areas if they matter to you</li>
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 py-6">
        <Button variant="secondary" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button onClick={handleNext} disabled={!statement.trim()} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

### src/features/onboarding/steps/areas-step.tsx

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useOnboardingStore } from '@/stores/onboarding.store'
import type { CreateAreaInput, AreaType } from '@/types/entities'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_AREAS: { type: AreaType; name: string; emoji: string; color: string }[] = [
  { type: 'health', name: 'Health', emoji: '💪', color: '#10b981' },
  { type: 'career', name: 'Career', emoji: '📈', color: '#6366f1' },
  { type: 'finance', name: 'Finance', emoji: '💰', color: '#eab308' },
  { type: 'relationships', name: 'Relationships', emoji: '❤️', color: '#f43f5e' },
  { type: 'hobbies', name: 'Hobbies & Growth', emoji: '🎨', color: '#06b6d4' },
  { type: 'mental', name: 'Mental Wellness', emoji: '🧘', color: '#a855f7' },
]

export function AreasStep() {
  const { selectedAreas, setAreas, nextStep, prevStep } = useOnboardingStore()
  const [selected, setSelected] = useState<CreateAreaInput[]>(
    selectedAreas.length > 0 ? selectedAreas : []
  )

  const toggleArea = (area: typeof DEFAULT_AREAS[0]) => {
    const exists = selected.find((a) => a.type === area.type)
    if (exists) {
      setSelected(selected.filter((a) => a.type !== area.type))
    } else {
      setSelected([...selected, { ...area }])
    }
  }

  const isSelected = (type: AreaType) => selected.some((a) => a.type === type)

  const handleNext = () => {
    setAreas(selected)
    nextStep()
  }

  return (
    <div className="flex-1 flex flex-col px-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose your life areas</h2>
        <p className="text-foreground-secondary">
          Select the areas you want to focus on. You can customize these later.
        </p>
      </div>

      {/* Area Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-2 gap-3">
          {DEFAULT_AREAS.map((area) => (
            <Card
              key={area.type}
              variant="list"
              padding="md"
              className={cn(
                'cursor-pointer relative',
                isSelected(area.type) && 'ring-2 ring-primary-500 bg-primary-50'
              )}
              onClick={() => toggleArea(area)}
            >
              {isSelected(area.type) && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="text-2xl mb-2">{area.emoji}</div>
              <div className="font-medium">{area.name}</div>
            </Card>
          ))}
        </div>

        <p className="mt-4 text-sm text-foreground-tertiary">
          {selected.length} area{selected.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 py-6">
        <Button variant="secondary" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button onClick={handleNext} disabled={selected.length === 0} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  )
}
```

### src/features/onboarding/steps/first-goal-step.tsx

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Chip } from '@/components/ui/chip'
import { useOnboardingStore } from '@/stores/onboarding.store'

export function FirstGoalStep() {
  const { selectedAreas, firstGoal, setFirstGoal, nextStep, prevStep } = useOnboardingStore()

  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0)
  const [name, setName] = useState(firstGoal?.name || '')
  const [why, setWhy] = useState(firstGoal?.why || '')

  const selectedArea = selectedAreas[selectedAreaIndex]

  const handleNext = () => {
    if (selectedArea) {
      setFirstGoal({
        area_id: '', // Will be set after areas are created
        name,
        why,
        status: 'active',
      })
    }
    nextStep()
  }

  return (
    <div className="flex-1 flex flex-col px-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Set your first goal</h2>
        <p className="text-foreground-secondary">
          Let&apos;s create a goal for one of your chosen areas.
        </p>
      </div>

      {/* Area Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select an area</label>
        <div className="flex flex-wrap gap-2">
          {selectedAreas.map((area, index) => (
            <Chip
              key={area.type}
              variant="selection"
              selected={selectedAreaIndex === index}
              onClick={() => setSelectedAreaIndex(index)}
              emoji={area.emoji}
            >
              {area.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* Goal Form */}
      <div className="flex-1 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            What do you want to achieve in {selectedArea?.name}?
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Run a marathon, Get promoted, Save $10,000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Why is this goal important? (optional)
          </label>
          <Textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="e.g., I want to prove to myself that I can commit to something challenging"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 py-6">
        <Button variant="secondary" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button onClick={handleNext} disabled={!name.trim()} className="flex-1">
          Complete Setup
        </Button>
      </div>
    </div>
  )
}
```

### src/features/onboarding/steps/complete-step.tsx

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Confetti } from '@/components/ui/animations'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { useCompleteOnboarding } from '@/features/onboarding/hooks/use-complete-onboarding'

export function CompleteStep() {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)
  const { reset } = useOnboardingStore()
  const { mutate: completeOnboarding, isPending } = useCompleteOnboarding()

  useEffect(() => {
    setShowConfetti(true)
  }, [])

  const handleComplete = () => {
    completeOnboarding(undefined, {
      onSuccess: () => {
        reset()
        router.push('/today')
      },
    })
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <Confetti trigger={showConfetti} />

      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full bg-done-bg flex items-center justify-center mb-6">
        <span className="text-4xl">🎉</span>
      </div>

      {/* Message */}
      <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
      <p className="text-foreground-secondary mb-8 max-w-sm">
        Your life roadmap is ready. Start checking in daily to build momentum toward your goals.
      </p>

      {/* Stats Preview */}
      <div className="w-full max-w-xs p-4 rounded-xl bg-surface-secondary mb-8">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-500">1</div>
            <div className="text-sm text-foreground-secondary">Direction</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-500">
              {useOnboardingStore.getState().selectedAreas.length}
            </div>
            <div className="text-sm text-foreground-secondary">Areas</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Button size="lg" onClick={handleComplete} isLoading={isPending} className="w-full max-w-xs">
        Start My Journey
      </Button>
    </div>
  )
}
```

---

## 5.5 Complete Onboarding Hook

### src/features/onboarding/hooks/use-complete-onboarding.ts

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { directionService } from '@/services/direction.service'
import { areaService } from '@/services/area.service'
import { goalService } from '@/services/goal.service'
import { createClient } from '@/lib/supabase/client'

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  const { direction, directionWhy, selectedAreas, firstGoal } = useOnboardingStore()

  return useMutation({
    mutationFn: async () => {
      // 1. Create direction
      await directionService.create({
        statement: direction,
        why: directionWhy || undefined,
      })

      // 2. Create areas
      const createdAreas = await Promise.all(
        selectedAreas.map((area, index) =>
          areaService.create({
            ...area,
            sort_order: index,
          })
        )
      )

      // 3. Create first goal (if provided)
      if (firstGoal && firstGoal.name) {
        const targetArea = createdAreas[0] // Use first area for the goal
        await goalService.create({
          ...firstGoal,
          area_id: targetArea.id,
        })
      }

      // 4. Update profile to mark onboarding complete
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}
```

---

## 5.6 Onboarding Guard (Proxy Check)

### src/lib/utils/check-onboarding.ts

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function checkOnboardingStatus() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { needsOnboarding: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  return { needsOnboarding: !profile?.onboarding_completed }
}

export async function redirectIfNotOnboarded() {
  const { needsOnboarding } = await checkOnboardingStatus()
  if (needsOnboarding) {
    redirect('/onboarding')
  }
}
```

---

## 5.7 에러 핸들링 & 로딩 상태

### src/features/onboarding/components/onboarding-error-boundary.tsx

```typescript
'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-miss-bg flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-miss" />
          </div>
          <h2 className="text-xl font-bold mb-2">문제가 발생했어요</h2>
          <p className="text-foreground-secondary mb-6 max-w-sm">
            온보딩 진행 중 오류가 발생했습니다.
            <br />
            다시 시도해 주세요.
          </p>
          <Button onClick={this.handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### src/features/onboarding/components/step-skeleton.tsx

```typescript
export function StepSkeleton() {
  return (
    <div className="flex-1 flex flex-col px-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-2/3 bg-surface-tertiary rounded mb-2" />
        <div className="h-4 w-full bg-surface-tertiary rounded" />
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 space-y-4">
        <div className="h-12 w-full bg-surface-tertiary rounded-lg" />
        <div className="h-12 w-full bg-surface-tertiary rounded-lg" />
        <div className="h-12 w-3/4 bg-surface-tertiary rounded-lg" />
      </div>

      {/* Button Skeleton */}
      <div className="flex gap-3 py-6">
        <div className="h-12 flex-1 bg-surface-tertiary rounded-lg" />
        <div className="h-12 flex-1 bg-surface-tertiary rounded-lg" />
      </div>
    </div>
  )
}
```

### useCompleteOnboarding 에러 처리 강화

```typescript
// src/features/onboarding/hooks/use-complete-onboarding.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { toast } from 'sonner'
import { completeOnboarding } from '@/actions/onboarding.actions'
import type { ApiResponse } from '@/types/api'

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  const store = useOnboardingStore()

  return useMutation({
    mutationFn: async () => {
      const result = await completeOnboarding({
        direction: store.direction,
        directionWhy: store.directionWhy,
        selectedValues: store.selectedValues,
        selectedAreas: store.selectedAreas,
        firstGoal: store.firstGoal,
        explorationMode: store.explorationMode,
      })

      if (!result.success) {
        throw new Error(result.error.message)
      }

      return result.data
    },

    onSuccess: () => {
      queryClient.invalidateQueries()
      toast.success('온보딩이 완료되었어요! 🎉')
    },

    onError: (error: Error) => {
      toast.error(error.message || '저장 중 오류가 발생했어요. 다시 시도해 주세요.')
    },

    // 3번까지 재시도
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })
}
```

### page.tsx에 Error Boundary 적용

```typescript
// src/app/onboarding/page.tsx 수정
import { OnboardingErrorBoundary } from '@/features/onboarding/components/onboarding-error-boundary'

export default function OnboardingPage() {
  // ... existing code

  return (
    <OnboardingErrorBoundary>
      <div className="min-h-screen flex flex-col">
        {/* ... existing content */}
      </div>
    </OnboardingErrorBoundary>
  )
}
```

---

## 5.8 폼 유효성 검증

### src/lib/validations/onboarding.ts

```typescript
import { z } from 'zod'

export const directionSchema = z.object({
  statement: z
    .string()
    .min(10, '방향은 최소 10자 이상 입력해 주세요')
    .max(200, '방향은 200자 이내로 입력해 주세요'),
  why: z.string().max(500, '이유는 500자 이내로 입력해 주세요').optional(),
})

export const valuesSchema = z.object({
  values: z
    .array(z.string())
    .min(1, '최소 1개 이상의 가치를 선택해 주세요')
    .max(3, '최대 3개까지 선택할 수 있어요'),
})

export const areasSchema = z.object({
  areas: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        emoji: z.string(),
        color: z.string(),
      })
    )
    .min(1, '최소 1개 이상의 영역을 선택해 주세요'),
})

export const firstGoalSchema = z.object({
  name: z
    .string()
    .min(2, '목표는 최소 2자 이상 입력해 주세요')
    .max(100, '목표는 100자 이내로 입력해 주세요'),
  why: z.string().max(300).optional(),
})

export type DirectionInput = z.infer<typeof directionSchema>
export type ValuesInput = z.infer<typeof valuesSchema>
export type AreasInput = z.infer<typeof areasSchema>
export type FirstGoalInput = z.infer<typeof firstGoalSchema>
```

### direction-step.tsx 유효성 검증 적용

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { directionSchema, type DirectionInput } from '@/lib/validations/onboarding'
import { cn } from '@/lib/utils'

export function DirectionStep() {
  const { direction, directionWhy, setDirection, nextStep, prevStep, setExplorationMode } = useOnboardingStore()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<DirectionInput>({
    resolver: zodResolver(directionSchema),
    defaultValues: {
      statement: direction,
      why: directionWhy,
    },
    mode: 'onChange', // 실시간 유효성 검증
  })

  const statementValue = watch('statement')
  const statementLength = statementValue?.length || 0

  const onSubmit = (data: DirectionInput) => {
    setDirection(data.statement, data.why || '')
    nextStep()
  }

  const handleExplorationMode = () => {
    setExplorationMode(true)
    setDirection('', '')
    nextStep()
  }

  return (
    <div className="flex-1 flex flex-col px-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">나의 인생 방향 정하기</h2>
        <p className="text-foreground-secondary">
          한 문장으로 당신이 원하는 삶의 방향을 표현해 보세요.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
        <div className="flex-1 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              나의 인생 방향은...
            </label>
            <Textarea
              {...register('statement')}
              placeholder="예: 건강하고 당당한 삶을 통해 가족과 오래 행복하게 살고 싶다"
              className={cn(
                'min-h-[100px]',
                errors.statement && 'border-miss focus:ring-miss'
              )}
            />
            <div className="flex justify-between mt-2">
              {errors.statement ? (
                <p className="text-sm text-miss">{errors.statement.message}</p>
              ) : (
                <p className="text-sm text-foreground-tertiary">
                  구체적일수록 좋아요
                </p>
              )}
              <span
                className={cn(
                  'text-sm',
                  statementLength > 200 ? 'text-miss' : 'text-foreground-tertiary'
                )}
              >
                {statementLength}/200
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              왜 이것이 중요한가요? (선택)
            </label>
            <Textarea
              {...register('why')}
              placeholder="예: 지금까지 건강을 소홀히 해서 후회가 많아요"
              className="min-h-[80px]"
            />
          </div>

          {/* 탐색 모드 버튼 */}
          <button
            type="button"
            onClick={handleExplorationMode}
            className="w-full p-4 rounded-lg border border-dashed border-border text-center text-foreground-secondary hover:bg-surface-secondary transition-colors"
          >
            <span className="text-lg mr-2">🔍</span>
            아직 모르겠어요 - 탐색하며 시작하기
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 py-6">
          <Button type="button" variant="secondary" onClick={prevStep} className="flex-1">
            이전
          </Button>
          <Button type="submit" disabled={!isValid} className="flex-1">
            다음
          </Button>
        </div>
      </form>
    </div>
  )
}
```

---

## 5.9 접근성 (A11y)

### step-indicator.tsx 접근성 강화

```typescript
'use client'

import { useOnboardingStore, OnboardingStep } from '@/stores/onboarding.store'
import { cn } from '@/lib/utils'

const VISIBLE_STEPS: { step: OnboardingStep; label: string }[] = [
  { step: 'values', label: '가치 선택' },
  { step: 'direction', label: '방향 설정' },
  { step: 'areas', label: '영역 선택' },
  { step: 'first-goal', label: '첫 목표' },
]

export function StepIndicator() {
  const { currentStep } = useOnboardingStore()
  const currentIndex = VISIBLE_STEPS.findIndex((s) => s.step === currentStep)

  return (
    <nav aria-label="온보딩 진행 상황">
      <ol className="flex items-center justify-center gap-2">
        {VISIBLE_STEPS.map((item, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex

          return (
            <li key={item.step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    isCompleted && 'bg-done text-white',
                    isCurrent && 'bg-primary-500 text-white',
                    !isCompleted && !isCurrent && 'bg-surface-tertiary text-foreground-tertiary'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={
                    isCompleted
                      ? `${item.label} - 완료`
                      : isCurrent
                      ? `${item.label} - 현재 단계`
                      : `${item.label} - 대기 중`
                  }
                >
                  {isCompleted ? (
                    <span aria-hidden="true">✓</span>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1 sr-only sm:not-sr-only',
                    isCurrent ? 'text-foreground font-medium' : 'text-foreground-tertiary'
                  )}
                >
                  {item.label}
                </span>
              </div>

              {index < VISIBLE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-2 mb-4',
                    isCompleted ? 'bg-done' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>

      {/* 스크린 리더용 현재 진행 상황 */}
      <p className="sr-only">
        온보딩 {currentIndex + 1}단계 중 {VISIBLE_STEPS.length}단계
      </p>
    </nav>
  )
}
```

### 키보드 네비게이션 훅

```typescript
// src/features/onboarding/hooks/use-step-keyboard.ts
import { useEffect, useCallback } from 'react'
import { useOnboardingStore } from '@/stores/onboarding.store'

interface UseStepKeyboardOptions {
  onNext?: () => void
  onPrev?: () => void
  canProceed?: boolean
}

export function useStepKeyboard({ onNext, onPrev, canProceed = true }: UseStepKeyboardOptions) {
  const { nextStep, prevStep, currentStep } = useOnboardingStore()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Enter로 다음 단계
      if (event.key === 'Enter' && !event.shiftKey && canProceed) {
        event.preventDefault()
        onNext?.() || nextStep()
      }

      // Escape로 이전 단계 (Welcome 제외)
      if (event.key === 'Escape' && currentStep !== 'welcome') {
        event.preventDefault()
        onPrev?.() || prevStep()
      }
    },
    [canProceed, onNext, onPrev, nextStep, prevStep, currentStep]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
```

---

## 5.10 탐색 모드 (Exploration Mode)

### Zustand 스토어 확장

```typescript
// src/stores/onboarding.store.ts 에 추가
interface OnboardingState {
  // ... 기존 상태
  explorationMode: boolean
  setExplorationMode: (mode: boolean) => void
}

// create 내부에 추가
explorationMode: false,
setExplorationMode: (mode) => set({ explorationMode: mode }),
```

### 탐색 모드 안내 화면

```typescript
// src/features/onboarding/components/exploration-mode-card.tsx
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Compass, Sparkles } from 'lucide-react'

interface ExplorationModeCardProps {
  onContinue: () => void
}

export function ExplorationModeCard({ onContinue }: ExplorationModeCardProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <Card className="max-w-sm p-8">
        <div className="w-16 h-16 rounded-full bg-ai-bg mx-auto mb-6 flex items-center justify-center">
          <Compass className="w-8 h-8 text-ai" />
        </div>

        <h2 className="text-xl font-bold mb-3">괜찮아요! 🌱</h2>

        <p className="text-foreground-secondary mb-6">
          인생의 방향은 살면서 찾아가는 거예요.
          <br /><br />
          지금은 방향 없이 시작하고,
          실천하면서 발견해도 돼요.
        </p>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-secondary mb-6">
          <Sparkles className="w-5 h-5 text-ai flex-shrink-0" />
          <p className="text-sm text-foreground-secondary text-left">
            inu가 당신의 패턴을 보면서 나중에 제안해 드릴게요.
          </p>
        </div>

        <Button onClick={onContinue} className="w-full">
          탐색하며 시작하기
        </Button>
      </Card>
    </div>
  )
}
```

### Direction Step에 탐색 모드 분기

```typescript
// direction-step.tsx의 return 부분에 추가
const { explorationMode } = useOnboardingStore()

// explorationMode가 활성화된 경우 안내 화면 표시
if (explorationMode) {
  return (
    <ExplorationModeCard
      onContinue={() => {
        setDirection('', '')
        nextStep()
      }}
    />
  )
}
```

---

## 5.11 Step 전환 애니메이션

### src/features/onboarding/components/step-transition.tsx

```typescript
'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore, OnboardingStep } from '@/stores/onboarding.store'

interface StepTransitionProps {
  children: ReactNode
  stepKey: OnboardingStep
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'values',
  'direction',
  'areas',
  'first-goal',
  'complete',
]

export function StepTransition({ children, stepKey }: StepTransitionProps) {
  const { currentStep } = useOnboardingStore()

  const currentIndex = STEP_ORDER.indexOf(currentStep)
  const childIndex = STEP_ORDER.indexOf(stepKey)
  const direction = childIndex >= currentIndex ? 1 : -1

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

### page.tsx에 애니메이션 적용

```typescript
// src/app/onboarding/page.tsx
'use client'

import { OnboardingErrorBoundary } from '@/features/onboarding/components/onboarding-error-boundary'
import { StepTransition } from '@/features/onboarding/components/step-transition'
import { useOnboardingStore } from '@/stores/onboarding.store'
// ... other imports

export default function OnboardingPage() {
  const { currentStep } = useOnboardingStore()

  const stepComponents = {
    welcome: WelcomeStep,
    values: ValuesStep,
    direction: DirectionStep,
    areas: AreasStep,
    'first-goal': FirstGoalStep,
    complete: CompleteStep,
  }

  const CurrentStepComponent = stepComponents[currentStep]

  return (
    <OnboardingErrorBoundary>
      <div className="min-h-screen flex flex-col">
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="py-4">
            <StepIndicator />
          </div>
        )}

        <StepTransition stepKey={currentStep}>
          <CurrentStepComponent />
        </StepTransition>
      </div>
    </OnboardingErrorBoundary>
  )
}
```

---

## 5.12 테스트

### src/stores/**tests**/onboarding.store.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useOnboardingStore } from '../onboarding.store'

describe('onboarding store', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset()
  })

  describe('step navigation', () => {
    it('starts at welcome step', () => {
      expect(useOnboardingStore.getState().currentStep).toBe('welcome')
    })

    it('navigates to next step', () => {
      const { nextStep } = useOnboardingStore.getState()
      nextStep()
      expect(useOnboardingStore.getState().currentStep).toBe('values')
    })

    it('navigates to previous step', () => {
      const { setStep, prevStep } = useOnboardingStore.getState()
      setStep('direction')
      prevStep()
      expect(useOnboardingStore.getState().currentStep).toBe('values')
    })

    it('does not go before welcome', () => {
      const { prevStep } = useOnboardingStore.getState()
      prevStep()
      expect(useOnboardingStore.getState().currentStep).toBe('welcome')
    })
  })

  describe('data collection', () => {
    it('stores selected values', () => {
      const { setValues } = useOnboardingStore.getState()
      setValues(['health', 'career', 'family'])
      expect(useOnboardingStore.getState().selectedValues).toEqual(['health', 'career', 'family'])
    })

    it('stores direction', () => {
      const { setDirection } = useOnboardingStore.getState()
      setDirection('My direction', 'My why')
      const state = useOnboardingStore.getState()
      expect(state.direction).toBe('My direction')
      expect(state.directionWhy).toBe('My why')
    })

    it('stores exploration mode', () => {
      const { setExplorationMode } = useOnboardingStore.getState()
      setExplorationMode(true)
      expect(useOnboardingStore.getState().explorationMode).toBe(true)
    })
  })

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const store = useOnboardingStore.getState()
      store.setValues(['health'])
      store.setDirection('test', 'why')
      store.setStep('areas')

      store.reset()

      const newState = useOnboardingStore.getState()
      expect(newState.currentStep).toBe('welcome')
      expect(newState.selectedValues).toEqual([])
      expect(newState.direction).toBe('')
    })
  })
})
```

### src/features/onboarding/steps/**tests**/values-step.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ValuesStep } from '../values-step'

// Mock the store
vi.mock('@/stores/onboarding.store', () => ({
  useOnboardingStore: () => ({
    selectedValues: [],
    setValues: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
  }),
}))

describe('ValuesStep', () => {
  it('renders all value options', () => {
    render(<ValuesStep />)

    expect(screen.getByText('Health & Wellness')).toBeInTheDocument()
    expect(screen.getByText('Career Growth')).toBeInTheDocument()
    expect(screen.getByText('Financial Freedom')).toBeInTheDocument()
  })

  it('allows selecting up to 3 values', () => {
    render(<ValuesStep />)

    fireEvent.click(screen.getByText('Health & Wellness'))
    fireEvent.click(screen.getByText('Career Growth'))
    fireEvent.click(screen.getByText('Financial Freedom'))

    expect(screen.getByText('3/3 selected')).toBeInTheDocument()
  })

  it('prevents selecting more than 3 values', () => {
    render(<ValuesStep />)

    fireEvent.click(screen.getByText('Health & Wellness'))
    fireEvent.click(screen.getByText('Career Growth'))
    fireEvent.click(screen.getByText('Financial Freedom'))
    fireEvent.click(screen.getByText('Relationships')) // 4th click

    // Should still be 3
    expect(screen.getByText('3/3 selected')).toBeInTheDocument()
  })

  it('disables continue button when no values selected', () => {
    render(<ValuesStep />)

    const continueButton = screen.getByRole('button', { name: /continue/i })
    expect(continueButton).toBeDisabled()
  })

  it('enables continue button when values are selected', () => {
    render(<ValuesStep />)

    fireEvent.click(screen.getByText('Health & Wellness'))

    const continueButton = screen.getByRole('button', { name: /continue/i })
    expect(continueButton).not.toBeDisabled()
  })
})
```

### src/features/onboarding/hooks/**tests**/use-complete-onboarding.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCompleteOnboarding } from '../use-complete-onboarding'

// Mock actions
vi.mock('@/actions/onboarding.actions', () => ({
  completeOnboarding: vi.fn(),
}))

// Mock store
vi.mock('@/stores/onboarding.store', () => ({
  useOnboardingStore: () => ({
    direction: 'Test direction',
    directionWhy: 'Test why',
    selectedValues: ['health'],
    selectedAreas: [{ type: 'health', name: 'Health', emoji: '💪', color: '#10b981' }],
    firstGoal: { name: 'Test goal' },
    explorationMode: false,
  }),
}))

import { completeOnboarding } from '@/actions/onboarding.actions'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCompleteOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls completeOnboarding action with correct data', async () => {
    vi.mocked(completeOnboarding).mockResolvedValue({ success: true, data: {} })

    const { result } = renderHook(() => useCompleteOnboarding(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledWith({
        direction: 'Test direction',
        directionWhy: 'Test why',
        selectedValues: ['health'],
        selectedAreas: [{ type: 'health', name: 'Health', emoji: '💪', color: '#10b981' }],
        firstGoal: { name: 'Test goal' },
        explorationMode: false,
      })
    })
  })

  it('handles error response', async () => {
    vi.mocked(completeOnboarding).mockResolvedValue({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '저장에 실패했습니다' },
    })

    const { result } = renderHook(() => useCompleteOnboarding(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
```

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. browser_navigate("http://localhost:3000/onboarding")
3. 전체 온보딩 플로우 테스트

Step-by-step 검증:
1. Welcome Step
   - browser_snapshot → "Get Started" 버튼 확인
   - browser_click("Get Started")

2. Values Step
   - browser_snapshot → 12개 가치 옵션 확인
   - browser_click 3개 선택 (Health, Career, Finance)
   - "Continue" 버튼 클릭

3. Direction Step
   - browser_type으로 방향성 입력
   - "Continue" 버튼 클릭

4. Areas Step
   - browser_snapshot → 6개 영역 카드 확인
   - browser_click으로 2-3개 선택
   - "Continue" 버튼 클릭

5. First Goal Step
   - browser_type으로 목표 입력
   - "Complete Setup" 버튼 클릭

6. Complete Step
   - browser_snapshot → Confetti 애니메이션 확인
   - "Start My Journey" 버튼 클릭
   - /today로 리다이렉트 확인
```

---

## ✅ Completion Checklist

### 기본 구현

- [ ] Onboarding store (Zustand with persistence)
- [ ] Step indicator component
- [ ] Welcome step
- [ ] Values selection step
- [ ] Direction input step
- [ ] Areas selection step
- [ ] First goal step
- [ ] Complete step with confetti
- [ ] useCompleteOnboarding hook
- [ ] Onboarding guard/proxy check (`src/proxy.ts`)

### 에러 핸들링 (5.7)

- [ ] OnboardingErrorBoundary 컴포넌트
- [ ] StepSkeleton 로딩 컴포넌트
- [ ] useCompleteOnboarding 에러 처리 (재시도 포함)
- [ ] 네트워크 오류 시 토스트 알림

### 폼 유효성 (5.8)

- [ ] Zod 스키마 정의 (directionSchema, valuesSchema 등)
- [ ] Direction 10-200자 검증
- [ ] 실시간 글자 수 표시
- [ ] 유효성 에러 메시지 (빨간색 텍스트)

### 접근성 (5.9)

- [ ] Step Indicator aria-current, aria-label
- [ ] 스크린 리더용 진행 상황 텍스트
- [ ] 키보드 네비게이션 (Enter, Escape)
- [ ] useStepKeyboard 훅

### 탐색 모드 (5.10)

- [ ] explorationMode 플래그 (Zustand)
- [ ] "아직 모르겠어요" 버튼
- [ ] ExplorationModeCard 안내 화면
- [ ] Direction Step에 탐색 모드 분기

### 애니메이션 (5.11)

- [ ] StepTransition 컴포넌트 (Framer Motion)
- [ ] 진행 방향별 슬라이드 애니메이션
- [ ] page.tsx에 애니메이션 적용

### 테스트 (5.12)

- [ ] onboarding.store.test.ts (Zustand 스토어)
- [ ] values-step.test.tsx (칩 선택 로직)
- [ ] use-complete-onboarding.test.ts (API 호출)
- [ ] E2E: 전체 온보딩 플로우
- [ ] E2E: 탐색 모드 플로우

---

## 🔗 Navigation

← [Phase 4.75: Landing & Authentication](./phase-4.75-auth.md)
→ [Phase 6: Today Screen](./phase-6-today.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
