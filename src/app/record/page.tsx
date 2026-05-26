import { createServerClient } from '@/infrastructure/supabase/client'
import { RunLogForm } from '@/presentation/components/form/run-log-form'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RecordPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F4F5F6' }}>
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
            textDecoration: 'none', color: '#2d3031',
          }}
        >←</Link>
        <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '1rem', fontWeight: 700, color: '#2d3031' }}>
          달리기 기록하기
        </div>
        <div style={{ width: '36px' }} />
      </div>
      <RunLogForm memberId={session.user.id} />
    </main>
  )
}
