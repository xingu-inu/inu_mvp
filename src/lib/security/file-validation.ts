/**
 * Magic byte validation for uploaded image files.
 * Checks actual file content instead of trusting client-reported MIME type.
 */

const IMAGE_SIGNATURES: Array<{
  mime: string
  bytes: number[]
  offset?: number
}> = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
]

const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50] // "WEBP" at offset 8

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 MB

export interface FileValidationResult {
  valid: boolean
  error?: string
  detectedMime?: string
}

/**
 * Validates an uploaded image file by checking:
 * 1. File extension whitelist
 * 2. File size limit
 * 3. Magic byte signature (actual file content)
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  // Extension check
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: '허용되지 않는 파일 형식입니다. (png, jpg, gif, webp)' }
  }

  // Size check
  if (file.size > MAX_AVATAR_SIZE) {
    return { valid: false, error: '파일 크기는 5MB 이하여야 합니다.' }
  }

  // Empty file check
  if (file.size === 0) {
    return { valid: false, error: '빈 파일은 업로드할 수 없습니다.' }
  }

  // Magic byte check (read first 12 bytes)
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())

  for (const sig of IMAGE_SIGNATURES) {
    const offset = sig.offset ?? 0
    const matches = sig.bytes.every((byte, i) => header[offset + i] === byte)
    if (matches) {
      // WebP needs secondary check at offset 8
      if (sig.mime === 'image/webp') {
        const webpMatch = WEBP_MARKER.every((byte, i) => header[8 + i] === byte)
        if (!webpMatch) continue
      }
      return { valid: true, detectedMime: sig.mime }
    }
  }

  return { valid: false, error: '파일 내용이 이미지 형식과 일치하지 않습니다.' }
}
