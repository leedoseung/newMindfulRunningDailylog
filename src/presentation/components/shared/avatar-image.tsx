const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  name: string
  avatarUrl?: string
  size: number
  bg?: string
  color?: string
  style?: React.CSSProperties
}

export function AvatarImage({ name, avatarUrl, size, bg = '#333', color = '#fff', style }: Props) {
  const base: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%',
    flexShrink: 0, overflow: 'hidden', ...style,
  }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        style={{ ...base, objectFit: 'cover', display: 'block' }}
      />
    )
  }

  return (
    <div style={{
      ...base,
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT,
      fontSize: `${Math.round(size * 0.38)}px`,
      fontWeight: 500,
    }}>
      {name.charAt(0)}
    </div>
  )
}
