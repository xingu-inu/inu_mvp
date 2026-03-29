'use client'

import { Component, type ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ReviewErrorBoundary extends Component<Props, State> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 text-center">
          <div className="mb-4 text-4xl">😵</div>
          <h3 className="mb-2 font-semibold">문제가 발생했어요</h3>
          <p className="mb-4 text-[var(--color-text-secondary)]">
            리뷰 데이터를 불러오는 중 오류가 발생했습니다
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>다시 시도</Button>
        </Card>
      )
    }

    return this.props.children
  }
}
