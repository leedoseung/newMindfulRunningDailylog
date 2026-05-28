import { createServerClient } from '@/infrastructure/supabase/client'
import { LinkMemberForm } from '@/presentation/components/auth/link-member-form'
import type { Member } from '@/domain/entities/member'

type MemberRow = {
  id: string
  name: string
  group_name: string
  generation: string
  insta_id: string
}

export default async function LinkMemberPage() {
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('members')
    .select('id, name, group_name, generation, insta_id')
    .is('auth_user_id', null)
    .order('name')

  const members: Member[] = (data ?? []).map((row: MemberRow) => ({
    id: row.id,
    name: row.name,
    groupName: row.group_name,
    generation: row.generation,
    instaId: row.insta_id,
    avatarUrl: '',
  }))

  return <LinkMemberForm members={members} />
}
