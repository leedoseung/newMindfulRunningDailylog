import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: { participationId: string } }

export default async function OgImage(_: Props) {
  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: '#F7F7F5', width: '100%', height: '100%',
        padding: 80, justifyContent: 'space-between',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: 24, color: '#888' }}>마인드풀러닝</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96, fontWeight: 700, color: '#111', letterSpacing: '-0.03em' }}>100일 완주</div>
          <div style={{ fontSize: 28, color: '#555', marginTop: 16 }}>매일 100개 × 100일 = 10,000개의 런지</div>
        </div>
        <div style={{ fontSize: 20, color: '#b8231f', letterSpacing: '0.1em' }}>CERTIFICATE</div>
      </div>
    ),
    size
  )
}
