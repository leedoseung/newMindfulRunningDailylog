import { createServerClient } from '@/infrastructure/supabase/client'
import { RunLogForm } from '@/presentation/components/form/run-log-form'
import { AppHeader } from '@/presentation/components/layout/app-header'

type RunLogFormInitial = {
  date: string; runTime: string | null; durationMin: number; title: string; location: string
  thoughtBefore: string; thoughtDuring: string; thoughtAfter: string; photoUrl: string
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''

  const [memberRow, editData] = await Promise.all([
    memberId
      ? supabase.from('members').select('name, avatar_url').eq('id', memberId).single()
      : Promise.resolve({ data: null }),
    edit
      ? supabase
          .from('run_logs')
          .select('date, run_time, duration_min, title, location, thought_before, thought_during, thought_after, photo_url')
          .eq('id', edit)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const memberName = (memberRow.data?.name as string | undefined) ?? ''
  const memberAvatarUrl = (memberRow.data?.avatar_url as string | undefined) ?? ''

  let initialData: RunLogFormInitial | undefined
  if (edit && editData.data) {
    const d = editData.data
    initialData = {
      date: d.date as string,
      runTime: (d.run_time as string | null) ?? null,
      durationMin: d.duration_min as number,
      title: d.title as string,
      location: d.location as string,
      thoughtBefore: d.thought_before as string,
      thoughtDuring: d.thought_during as string,
      thoughtAfter: d.thought_after as string,
      photoUrl: d.photo_url as string,
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5' }}>
      <AppHeader memberName={memberName} memberAvatarUrl={memberAvatarUrl} memberId={memberId} />
      <RunLogForm
        memberId={memberId}
        memberName={memberName}
        memberAvatarUrl={memberAvatarUrl}
        mode={edit ? 'edit' : 'create'}
        recordId={edit}
        initialData={initialData}
      />
    </main>
  )
}
