export function toTransformedUrl(url: string | null | undefined, width: number, quality = 75): string {
  if (!url) return ''
  // Supabase Storage: /object/public/ → /render/image/public/
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    + `?width=${width}&quality=${quality}`
}
