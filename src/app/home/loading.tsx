const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const SKELETON = '#ECECE8'

function Box({ w, h, br = 8 }: { w: string | number; h: string | number; br?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: br,
        background: SKELETON,
        animation: 'skeleton-pulse 1.4s ease-in-out infinite',
        flexShrink: 0,
      }}
    />
  )
}

export default function HomeLoading() {
  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5', fontFamily: FONT }}>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 20px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Box w={32} h={32} br={8} />
          <Box w={96} h={18} />
        </div>
        <Box w={36} h={36} br={18} />
      </header>

      <section style={{ padding: '8px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', height: 90, gap: 8 }}>
          {[28, 44, 36, 60, 48, 72, 56].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Box w="100%" h={h} br={4} />
              <Box w={12} h={10} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '8px 20px 16px', display: 'flex', gap: 12, overflowX: 'hidden' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Box w={56} h={56} br={28} />
            <Box w={40} h={10} />
          </div>
        ))}
      </section>

      <section style={{ padding: '8px 20px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{ aspectRatio: '1 / 1' }}>
              <Box w="100%" h="100%" br={4} />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
