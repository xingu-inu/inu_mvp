import { describe, it, expect } from 'vitest'
import { cn } from '../cn'

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('should dedupe Tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should handle mixed inputs', () => {
    expect(cn('foo', ['bar', 'baz'], { qux: true, quux: false })).toBe('foo bar baz qux')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(null, undefined, false)).toBe('')
  })

  it('should merge conflicting Tailwind classes correctly', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('bg-red-100 hover:bg-red-200', 'bg-blue-100')).toBe('hover:bg-red-200 bg-blue-100')
  })
})
