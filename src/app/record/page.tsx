import { redirect } from 'next/navigation'

// /record → / (기록 폼은 루트에서 처리)
export default function RecordPage() {
  redirect('/')
}
