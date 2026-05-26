import type { Member } from '@/domain/entities/member'

type Props = {
  members: Member[]
  value: string
  onChange: (id: string) => void
}

export function MemberSelect({ members, value, onChange }: Props) {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '0.57rem', fontWeight: 500, color: '#888', marginBottom: '3px' }}>이름 선택</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontFamily: 'var(--font-raleway)', fontSize: '0.92rem', fontWeight: 700,
          color: value ? '#2d3031' : '#ccc',
          border: 'none', background: 'transparent',
          width: '100%', outline: 'none', cursor: 'pointer',
        }}
      >
        <option value="">-- 이름을 선택해주세요 --</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </div>
  )
}
