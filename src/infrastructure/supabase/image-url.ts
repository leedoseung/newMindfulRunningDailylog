// Images are pre-compressed at upload time (1200px run photos, 400px avatars),
// so we serve raw /object/public/ URLs and skip Supabase's render/image endpoint.
// That endpoint counts against the paid Image Transformations quota; raw URLs do not.
// The width/quality params are kept for call-site readability and future flexibility.
export function toTransformedUrl(url: string | null | undefined, _width: number, _quality = 75): string {
  return url ?? ''
}
