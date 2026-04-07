import { useRef, useEffect, useState, useCallback } from 'react'
import { useStore } from '../stores/useStore'
import styles from './Lightbox.module.css'

export default function Lightbox() {
  const {
    lightboxPost, lightboxIndex, lightboxList,
    closeLightbox, lightboxNext, lightboxPrev
  } = useStore()

  const videoRef     = useRef(null)
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef(null)

  // Swipe-to-close
  const touchStartY = useRef(null)
  const touchStartX = useRef(null)
  const [dragY, setDragY] = useState(0)
  const isDragging  = useRef(false)

  const isVideo = lightboxPost?.type === 'video'
  const hasPrev = lightboxIndex > 0
  const hasNext = lightboxIndex < lightboxList.length - 1

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [lightboxPost, isVideo])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

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

  // ── Swipe handlers ─────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
    isDragging.current  = false
    setDragY(0)
  }

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return
    const dy = e.touches[0].clientY - touchStartY.current
    const dx = e.touches[0].clientX - touchStartX.current

    if (!isDragging.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        isDragging.current = true
      } else if (Math.abs(dx) > 10) {
        // horizontal swipe — bail out
        touchStartY.current = null
        return
      }
    }

    if (isDragging.current && dy > 0) {
      e.preventDefault()
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
    isDragging.current  = false
  }

  if (!lightboxPost) return null

  const dragOpacity = dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : undefined
  const dragScale   = dragY > 0 ? Math.max(0.88, 1 - dragY / 1200) : undefined

  return (
    <div
      className={styles.backdrop}
      style={{ opacity: dragOpacity }}
      onMouseMove={resetHideTimer}
    >
      <div
        ref={containerRef}
        className={`${styles.container} ${showControls ? styles.showControls : ''}`}
        style={dragY > 0 ? {
          transform: `translateY(${dragY}px) scale(${dragScale})`,
          transition: 'none'
        } : undefined}
      >
        {/* ── Top bar ─────────────────────────────────────────────────── */}
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
            <button className={styles.iconBtn} onClick={toggleFullscreen}>
              {isFullscreen ? '⊡' : '⛶'}
            </button>
            <button className={styles.iconBtn} onClick={closeLightbox}>✕</button>
          </div>
        </div>

        {/* ── Media area ──────────────────────────────────────────────── */}
        <div className={styles.mediaArea}>
          {isVideo ? (
            <video
              ref={videoRef}
              key={lightboxPost.id}
              src={lightboxPost.url}
              className={styles.mediaEl}
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
              className={styles.mediaEl}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {/* ── Prev / Next ──────────────────────────────────────────────── */}
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

        {/* ── Bottom bar ──────────────────────────────────────────────── */}
        <div className={styles.bottomBar}>
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

        {/*
         * ── Drag handle ────────────────────────────────────────────────
         * Sits above everything (z-index 40) but only over the TOP portion
         * of the screen (bottom edge = 30% from bottom, leaving the video
         * controls strip + bottomBar free).
         *
         * pointer-events: auto  → receives touch events
         * background: transparent → visually invisible
         * No click handler → clicks fall through via the browser's normal
         * hit-testing (the handle captures touch but not pointer clicks
         * because we never call stopPropagation on click).
         *
         * For debugging, set background to rgba(255,0,0,0.15)
         */}
        <div
          className={styles.dragHandle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>
    </div>
  )
}
