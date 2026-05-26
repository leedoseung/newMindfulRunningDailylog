'use client'

import { useRef, useState, useEffect } from 'react'

type Props = {
  file: File | null
  onChange: (file: File | null) => void
}

export function PhotoUpload({ file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        background: '#fff', borderRadius: '16px',
        border: '2px dashed #EBEBEB', cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '100%', height: '160px',
              backgroundImage: `url(${previewUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}
          />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(null) }}
            style={{
              position: 'absolute', top: '8px', right: '8px',
              width: '28px', height: '28px', borderRadius: '50%',
              border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff',
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
      ) : (
        <div style={{ padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '4px', opacity: 0.6 }}>📷</div>
          <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.82rem', fontWeight: 700, color: '#2d3031' }}>사진 추가</div>
          <div style={{ fontSize: '0.62rem', color: '#888' }}>탭해서 갤러리에서 선택</div>
        </div>
      )}
    </div>
  )
}
