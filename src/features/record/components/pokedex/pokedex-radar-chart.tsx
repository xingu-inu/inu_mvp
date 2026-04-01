'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import type { ProfileTrait, TraitCategory } from '@/types/entities'

const CATEGORY_LABELS: Record<TraitCategory, string> = {
  identity: '성격',
  stats: '능력',
  interests: '관심사',
  description: '소개',
  habits: '습관',
  general: '기타',
}

interface PokedexRadarChartProps {
  traits: ProfileTrait[]
}

export function PokedexRadarChart({ traits }: PokedexRadarChartProps) {
  const [show, setShow] = useState(false)

  const countsByCategory = traits.reduce<Partial<Record<TraitCategory, number>>>((acc, trait) => {
    const cat = trait.category ?? 'general'
    acc[cat] = (acc[cat] ?? 0) + 1
    return acc
  }, {})

  const categoriesWithTraits = Object.keys(countsByCategory) as TraitCategory[]

  if (categoriesWithTraits.length < 3) return null

  const maxCount = Math.max(...(Object.values(countsByCategory) as number[]))

  const data = categoriesWithTraits.map((cat) => ({
    category: CATEGORY_LABELS[cat],
    count: countsByCategory[cat] ?? 0,
    fullMark: maxCount,
  }))

  return (
    <div className="hidden lg:block">
      <button
        onClick={() => setShow((prev) => !prev)}
        className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
      >
        {show ? '차트 숨기기' : '차트 보기'}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 200 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                />
                <Radar
                  dataKey="count"
                  stroke="var(--color-primary-500)"
                  fill="var(--color-primary-500)"
                  fillOpacity={0.15}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
