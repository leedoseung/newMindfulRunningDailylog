import { createServerClient } from '@/infrastructure/supabase/client'
import { RunLogForm } from '@/presentation/components/form/run-log-form'
import Link from 'next/link'

type RunLogFormInitial = {
  date: string; durationMin: number; title: string; location: string
  thoughtBefore: string; thoughtDuring: string; thoughtAfter: string; photoUrl: string
}

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''

  let initialData: RunLogFormInitial | undefined
  if (edit) {
    const { data } = await supabase
      .from('run_logs')
      .select('date, duration_min, title, location, thought_before, thought_during, thought_after, photo_url')
      .eq('id', edit)
      .single()
    if (data) {
      initialData = {
        date: data.date as string,
        durationMin: data.duration_min as number,
        title: data.title as string,
        location: data.location as string,
        thoughtBefore: data.thought_before as string,
        thoughtDuring: data.thought_during as string,
        thoughtAfter: data.thought_after as string,
        photoUrl: data.photo_url as string,
      }
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 22px 20px',
      }}>
        <Link
          href="/"
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
            textDecoration: 'none', color: '#111111',
          }}
        >←</Link>
        <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1rem', fontWeight: 500, color: '#111111' }}>
          {edit ? '기록 수정하기' : '달리기 기록하기'}
        </div>
        <div style={{ width: '36px' }} />
      </div>
      <RunLogForm
        memberId={memberId}
        mode={edit ? 'edit' : 'create'}
        recordId={edit}
        initialData={initialData}
      />
    </main>
  )
}
