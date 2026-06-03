'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ImageLightboxProps {
  src: string
  alt: string
  style?: React.CSSProperties
}

export function ImageLightbox({ src, alt, style }: ImageLightboxProps) {
  const [open, setOpen] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close])

  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) close()
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        style={{ ...style, cursor: 'zoom-in' }}
        onClick={() => setOpen(true)}
      />
      {open && createPortal(
        <div
          ref={overlayRef}
          onClick={onOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <img
            src={src}
            alt={alt}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          />
        </div>,
        document.body,
      )}
    </>
  )
}
