'use client'

import { CardShell } from './card-shell'

type AlbumPhoto = {
  runId: string
  photoUrl: string
  date: string
}

type Props = {
  photos: AlbumPhoto[]
  overflow: number
}

export function AlbumCard({ photos, overflow }: Props) {
  // Show up to 9 thumbnails; last cell shows "+N more" if overflow > 0
  const cells = photos.slice(0, 9)
  const showOverlay = overflow > 0 && cells.length === 9

  return (
    <CardShell label="앨범 카드" bg="#111">
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '1.5rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
        }}
      >
        앨범
      </p>

      <p
        style={{
          margin: '0 0 20px',
          fontSize: '0.875rem',
          fontWeight: 400,
          opacity: 0.6,
        }}
      >
        한 달 모두.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
          width: '100%',
          maxWidth: '340px',
        }}
      >
        {cells.map((photo, i) => {
          const isLast = i === cells.length - 1 && showOverlay
          return (
            <div
              key={photo.runId}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                borderRadius: '4px',
                backgroundColor: '#222',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.photoUrl}
                alt={`${photo.date} 달리기 사진`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {isLast && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  +{overflow} more
                </div>
              )}
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}
