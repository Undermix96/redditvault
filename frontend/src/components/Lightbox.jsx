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

  // Swipe-to-close state
  const touchStartY = useRef(null)
  const touchStartX = useRef(null)
  const [dragY, setDragY] = useState(0)
  const isDragging  = useRef(false)

  const isGif   = lightboxPost?.type === 'gif'
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

  // ── Swipe handlers on the drag-handle overlay ──────────────────────────
  // The handle sits over the top 70% of the media area, clear of the native
  // video controls strip (which occupies the bottom ~40px of the video el).
  // pointer-events: none on the handle keeps click-through to the media;
  // only touch events are captured here for the swipe gesture.
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
      // Commit to vertical drag only if clearly more vertical than horizontal
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        isDragging.current = true
      } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        // Horizontal swipe — abort, let the event through
        touchStartY.current = null
        return
      }
    }

    if (isDragging.current && dy > 0) {
      // Prevent the page from scrolling while we're dragging
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

          {/*
           * Drag handle: transparent overlay covering the TOP 65% of the
           * media area. click-through (pointer-events: none) so taps/clicks
           * reach the media underneath. Only touch events are handled here.
           * The bottom 35% is left free so native video controls are fully
           * usable without triggering the swipe gesture.
           */}
          <div
            className={styles.dragHandle}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* ── Prev / Next — z-index above everything ───────────────────── */}
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
      </div>
    </div>
  )
}
