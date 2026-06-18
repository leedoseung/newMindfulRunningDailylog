import { revalidatePath } from 'next/cache'

/** Invalidate Wrapped + full-diary cache for the month containing dateStr (YYYY-MM-DD). */
export function revalidateDiaryMonth(memberId: string, dateStr: string): void {
  const [y, m] = dateStr.split('-')
  revalidatePath(`/diary/${memberId}/${y}-${m}`)
  revalidatePath(`/diary/${memberId}/${y}-${m}/all`)
}
