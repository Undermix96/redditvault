import { useRef, useEffect, useState, useCallback } from 'react'
import { useStore } from '../stores/useStore'
import styles from './Lightbox.module.css'

export default function Lightbox() {
  const { lightboxPost, lightboxIndex, lightboxList, closeLightbox, lightboxNext, lightboxPrev } = useStore()
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef(null)

  // Swipe-to-close state
  const touchStartY = useRef(null)
  const touchStartX = useRef(null)
  const [dragY, setDragY] = useState(0)
  const isDragging = useRef(false)

  const isVideo = lightboxPost?.type === 'video' || lightboxPost?.type === 'gif'
  const hasPrev = lightboxIndex > 0
  const hasNext = lightboxIndex < lightboxList.length - 1

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Autoplay on post change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [lightboxPost])

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Auto-hide overlay after 3s
  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => {
    resetHideTimer()
    return () => clearTimeout(hideTimer.current)
  }, [lightboxPost, resetHideTimer])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.()
    } else {
      await document.exitFullscreen?.()
    }
  }

  // Swipe handlers — only on the backdrop/container, not on the video element
  const handleTouchStart = (e) => {
    // Don't intercept touches on the video element itself
    if (e.target.tagName === 'VIDEO') return
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
    isDragging.current = false
  }

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return
    if (e.target.tagName === 'VIDEO') return

    const dy = e.touches[0].clientY - touchStartY.current
    const dx = e.touches[0].clientX - touchStartX.current

    // Only treat as vertical drag if more vertical than horizontal
    if (!isDragging.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      isDragging.current = true
    }

    if (isDragging.current && dy > 0) {
      setDragY(dy)
    }
  }

  const handleTouchEnd = () => {
    if (isDragging.current && dragY > 80) {
      closeLightbox()
    } else {
      setDragY(0)
    }
    touchStartY.current = null
    touchStartX.current = null
    isDragging.current = false
  }

  if (!lightboxPost) return null

  const dragOpacity = Math.max(0.3, 1 - dragY / 300)
  const dragScale = Math.max(0.88, 1 - dragY / 1200)

  return (
    <div
      className={styles.backdrop}
      style={{ opacity: dragY > 0 ? dragOpacity : undefined }}
      onMouseMove={resetHideTimer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={containerRef}
        className={`${styles.container} ${showControls ? styles.showControls : ''}`}
        style={dragY > 0 ? {
          transform: `translateY(${dragY}px) scale(${dragScale})`,
          transition: 'none'
        } : undefined}
      >
        {/* Top Bar */}
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <span className={styles.subredditTag}>r/{lightboxPost.subreddit}</span>
            <span className={styles.slash}>/</span>
            <span className={styles.categoryTag}>{lightboxPost.category}</span>
          </div>
          <p className={styles.titleTop}>{lightboxPost.title}</p>
          <div className={styles.topRight}>
            <span className={styles.counter}>
              {lightboxIndex + 1} / {lightboxList.length}
            </span>
            <button className={styles.iconBtn} onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? '⊡' : '⛶'}
            </button>
            <button className={styles.iconBtn} onClick={closeLightbox} title="Chiudi">✕</button>
          </div>
        </div>

        {/* Media area — no overflow:hidden so native video controls are reachable */}
        <div className={styles.mediaArea}>
          {isVideo ? (
            <video
              ref={videoRef}
              key={lightboxPost.id}
              src={lightboxPost.url}
              className={styles.media}
              autoPlay
              loop
              playsInline
              controls
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              key={lightboxPost.id}
              src={lightboxPost.url}
              alt={lightboxPost.title}
              className={styles.mediaImg}
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Prev / Next arrows */}
          {hasPrev && (
            <button
              className={`${styles.navBtn} ${styles.navPrev}`}
              onClick={(e) => { e.stopPropagation(); lightboxPrev() }}
              aria-label="Precedente"
            >‹</button>
          )}
          {hasNext && (
            <button
              className={`${styles.navBtn} ${styles.navNext}`}
              onClick={(e) => { e.stopPropagation(); lightboxNext() }}
              aria-label="Successivo"
            >›</button>
          )}
        </div>

        {/* Bottom bar — only "open original" link, no dot nav */}
        <div className={styles.bottomBar}>
          <div />
          <a
            href={lightboxPost.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openBtn}
            onClick={(e) => e.stopPropagation()}
          >
            Apri originale ↗
          </a>
        </div>
      </div>
    </div>
  )
}
