import { createClient } from '@/lib/supabase/client'

/**
 * Upload avatar image to Supabase Storage
 * @param userId - User's UUID
 * @param file - Image file to upload
 * @returns Public URL of the uploaded avatar
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar.${fileExt}`

  const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)

  return data.publicUrl
}

/**
 * Delete avatar image from Supabase Storage
 * @param userId - User's UUID
 */
export async function deleteAvatar(userId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from('avatars')
    .remove([
      `${userId}/avatar.png`,
      `${userId}/avatar.jpg`,
      `${userId}/avatar.jpeg`,
      `${userId}/avatar.webp`,
    ])

  if (error) throw error
}

/**
 * Get avatar public URL
 * @param userId - User's UUID
 * @param ext - File extension (default: 'png')
 * @returns Public URL of the avatar
 */
export function getAvatarUrl(userId: string, ext = 'png'): string {
  const supabase = createClient()
  const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar.${ext}`)

  return data.publicUrl
}
