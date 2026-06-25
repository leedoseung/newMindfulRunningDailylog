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
      }}
    />
  )
}

export default function Loading() {
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

      <section style={{ padding: '12px 20px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Box w="60%" h={28} />
        <Box w="100%" h={180} br={16} />
        <Box w="100%" h={48} br={12} />
        <Box w="100%" h={48} br={12} />
        <Box w="100%" h={120} br={12} />
        <Box w="100%" h={120} br={12} />
        <Box w="40%" h={44} br={22} />
      </section>
    </main>
  )
}
