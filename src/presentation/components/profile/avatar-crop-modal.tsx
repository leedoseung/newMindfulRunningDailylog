'use client'

import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  imageSrc: string
  onComplete: (blob: Blob) => void
  onCancel: () => void
}

async function cropImageToBlob(imageSrc: string, cropArea: Area): Promise<Blob> {
  const img = new Image()
  img.src = imageSrc
  await new Promise<void>(resolve => { img.onload = () => resolve() })

  const canvas = document.createElement('canvas')
  const SIZE = 400
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  // circular clip
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
  ctx.clip()

  ctx.drawImage(
    img,
    cropArea.x, cropArea.y, cropArea.width, cropArea.height,
    0, 0, SIZE, SIZE,
  )

  return new Promise<Blob>(resolve =>
    canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.9)
  )
}

export function AvatarCropModal({ imageSrc, onComplete, onCancel }: Props) {
  const [crop, setCrop]         = useState({ x: 0, y: 0 })
  const [zoom, setZoom]         = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [processing, setProcessing]   = useState(false)

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels)
  }, [])

  async function handleDone() {
    if (!croppedArea) return
    setProcessing(true)
    try {
      const blob = await cropImageToBlob(imageSrc, croppedArea)
      onComplete(blob)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '52px 20px 16px', flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: FONT, fontSize: '0.85rem', fontWeight: 400, color: 'rgba(255,255,255,0.6)',
          }}
        >취소</button>
        <div style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 500, color: '#fff' }}>
          프로필 사진
        </div>
        <button
          type="button"
          onClick={handleDone}
          disabled={processing}
          style={{
            background: 'none', border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
            fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600,
            color: processing ? 'rgba(255,255,255,0.3)' : '#fff',
          }}
        >{processing ? '처리중...' : '완료'}</button>
      </div>

      {/* Cropper area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: 'transparent' },
            cropAreaStyle: {
              border: '2px solid rgba(255,255,255,0.8)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            },
          }}
        />
      </div>

      {/* Zoom slider */}
      <div style={{
        padding: '20px 40px 48px', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{ fontFamily: FONT, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
          핀치 또는 슬라이더로 크기 조절
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#fff', cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}
