/**
 * Color contrast utilities for determining text color on colored backgrounds.
 */

/**
 * Parse a hex color string (#RRGGBB or #RGB) to [r, g, b] in 0-255 range.
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '')
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16)
    const g = parseInt(cleaned[1] + cleaned[1], 16)
    const b = parseInt(cleaned[2] + cleaned[2], 16)
    return [r, g, b]
  }
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ]
}

/**
 * Linearize an sRGB channel value (0-255) to linear light.
 */
function linearize(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/**
 * Compute relative luminance of a hex color (0 = black, 1 = white).
 */
export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/**
 * Returns true if the background is dark enough for white text.
 */
export function shouldUseWhiteText(hex: string): boolean {
  return getLuminance(hex) < 0.45
}
