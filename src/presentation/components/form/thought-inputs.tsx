type ThoughtKey = 'before' | 'during' | 'after'

const CONFIG: Record<ThoughtKey, { dot: string; label: string; placeholder: string }> = {
  before: { dot: '#3B82F6', label: '달리기 전', placeholder: '달리기 전 마음은 어땠나요?' },
  during: { dot: '#F59E0B', label: '달리는 중', placeholder: '달리면서 어떤 생각이 들었나요?' },
  after:  { dot: '#10B981', label: '달린 후',   placeholder: '달리고 나서 어떤 느낌인가요?' },
}

type Props = {
  before: string
  during: string
  after: string
  onChange: (key: ThoughtKey, value: string) => void
}

export function ThoughtInputs({ before, during, after, onChange }: Props) {
  const values: Record<ThoughtKey, string> = { before, during, after }

  return (
    <div>
      {(['before', 'during', 'after'] as ThoughtKey[]).map(key => {
        const c = CONFIG[key]
        return (
          <div
            key={key}
            style={{ background: '#fff', borderRadius: '16px', padding: '16px 18px', marginBottom: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
              <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.72rem', fontWeight: 500, color: '#111111' }}>
                {c.label}
              </div>
            </div>
            <textarea
              value={values[key]}
              onChange={e => onChange(key, e.target.value)}
              placeholder={c.placeholder}
              rows={2}
              style={{
                width: '100%', border: 'none', outline: 'none',
                fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.82rem', color: '#333',
                lineHeight: 1.6, resize: 'none', background: 'transparent',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
