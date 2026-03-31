import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'

interface SampleChipsProps {
  items: string[]
  selectedValue: string
  onToggle: (value: string) => void
  className?: string
  /** When true, prevents mousedown default to keep input focus when clicking chips */
  preventBlur?: boolean
}

export function SampleChips({
  items,
  selectedValue,
  onToggle,
  className,
  preventBlur,
}: SampleChipsProps) {
  if (items.length === 0) return null
  return (
    <div
      className={cn('flex flex-wrap gap-1.5', className)}
      onMouseDown={preventBlur ? (e) => e.preventDefault() : undefined}
    >
      {items.map((item) => (
        <Chip
          key={item}
          variant="selection"
          selected={selectedValue === item}
          onClick={() => onToggle(item)}
          className="cursor-pointer text-xs"
        >
          {item}
        </Chip>
      ))}
    </div>
  )
}
