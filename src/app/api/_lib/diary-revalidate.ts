import { revalidatePath } from 'next/cache'

/** Invalidate Wrapped + full-diary + OG image cache for the month containing dateStr (YYYY-MM-DD). */
export function revalidateDiaryMonth(memberId: string, dateStr: string): void {
  const [y, m] = dateStr.split('-')
  revalidatePath(`/diary/${memberId}/${y}-${m}`)
  revalidatePath(`/diary/${memberId}/${y}-${m}/all`)
  revalidatePath(`/api/og/diary/${memberId}/${y}-${m}`)
}
