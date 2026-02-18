import { LIFESTYLE_OPTIONS, VALUE_OPTIONS } from '@/lib/constants/onboarding'

/**
 * Generate a Direction sentence from selected lifestyle and value IDs.
 * Template: "나는 {lifestyle1}하고 {lifestyle2} 삶을 통해 {value1}과 {value2}을 추구하며 살고 싶다"
 */
export function generateDirectionSentence(
  selectedLifestyles: string[],
  selectedValues: string[],
  customLifestyle: string | null,
  customValue: string | null
): string | null {
  const lifestyleLabels = selectedLifestyles
    .map((id) => LIFESTYLE_OPTIONS.find((opt) => opt.id === id)?.label)
    .filter(Boolean) as string[]
  if (customLifestyle) lifestyleLabels.push(customLifestyle)

  const valueLabels = selectedValues
    .map((id) => VALUE_OPTIONS.find((opt) => opt.id === id)?.label)
    .filter(Boolean) as string[]
  if (customValue) valueLabels.push(customValue)

  if (lifestyleLabels.length === 0 || valueLabels.length === 0) {
    return null
  }

  const lifestyleText = lifestyleLabels.slice(0, 2).join('하고 ')
  const valueText = valueLabels.slice(0, 2).join('과 ')
  return `나는 ${lifestyleText} 삶을 통해 ${valueText}을 추구하며 살고 싶다`
}
