export function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export function kstDateOf(timestamptz: string): string {
  return new Date(new Date(timestamptz).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
