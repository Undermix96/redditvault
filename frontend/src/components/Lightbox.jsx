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
  const backdropRef  = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef(null)

  // Swipe state — all in refs so event listeners (non-React) can access them
  const touchStartY  = useRef(null)
  const touchStartX  = useRef(null)
  const dragYRef     = useRef(0)
  const isDragging   = useRef(false)
  const [dragY, setDragY] = useState(0)

  const isVideo = lightboxPost?.type === 'video'
  const hasPrev = lightboxIndex > 0
  const hasNext = lightboxIndex < lightboxList.length - 1

  // Store latest callbacks in refs so native listeners always call current version
  const closeLightboxRef = useRef(closeLightbox)
  useEffect(() => { closeLightboxRef.current = closeLightbox }, [closeLightbox])

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

  // ── Native (non-passive) touch listeners on the backdrop ───────────────
  // React synthetic touch events cannot call preventDefault() reliably on
  // modern browsers because React attaches listeners as passive by default.
  // We need { passive: false } to be able to call preventDefault() during
  // touchmove and prevent the browser from scrolling/zooming.
  useEffect(() => {
    const el = backdropRef.current
    if (!el) return

    const shouldIgnore = (e) => {
      // Always let buttons and links handle their own touch → click flow
      if (e.target.closest('button, a')) return true

      // Bottom 25% of a video element = native controls strip
      if (e.target.tagName === 'VIDEO') {
        const rect = e.target.getBoundingClientRect()
        const relY = e.touches[0].clientY - rect.top
        if (relY > rect.height * 0.75) return true
      }

      return false
    }

    const onStart = (e) => {
      if (shouldIgnore(e)) return
      touchStartY.current = e.touches[0].clientY
      touchStartX.current = e.touches[0].clientX
      isDragging.current  = false
      dragYRef.current    = 0
      setDragY(0)
    }

    const onMove = (e) => {
      if (touchStartY.current === null) return

      const dy = e.touches[0].clientY - touchStartY.current
      const dx = e.touches[0].clientX - touchStartX.current

      if (!isDragging.current) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
          isDragging.current = true
        } else if (Math.abs(dx) > 10) {
          touchStartY.current = null
          return
        }
      }

      if (isDragging.current && dy > 0) {
        // This preventDefault() actually works because listener is non-passive
        e.preventDefault()
        dragYRef.current = dy
        setDragY(dy)
      }
    }

    const onEnd = () => {
      if (isDragging.current && dragYRef.current > 80) {
        closeLightboxRef.current()
      } else {
        dragYRef.current = 0
        setDragY(0)
      }
      touchStartY.current = null
      touchStartX.current = null
      isDragging.current  = false
    }

    // { passive: false } is the key — allows preventDefault() in onMove
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, []) // no deps — refs keep values current

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.()
    } else {
      await document.exitFullscreen?.()
    }
  }

  if (!lightboxPost) return null

  const dragOpacity = dragY > 0 ? Math.max(0.3, 1 - dragY / 300) : undefined
  const dragScale   = dragY > 0 ? Math.max(0.88, 1 - dragY / 1200) : undefined

  return (
    <div
      ref={backdropRef}
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
            />
          ) : (
            <img
              key={lightboxPost.id}
              src={lightboxPost.url}
              alt={lightboxPost.title}
              className={styles.mediaEl}
            />
          )}
        </div>

        {/* ── Prev / Next ──────────────────────────────────────────────── */}
        {hasPrev && (
          <button
            className={`${styles.navBtn} ${styles.navPrev}`}
            onClick={lightboxPrev}
            aria-label="Precedente"
          >‹</button>
        )}
        {hasNext && (
          <button
            className={`${styles.navBtn} ${styles.navNext}`}
            onClick={lightboxNext}
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
          >
            Apri originale ↗
          </a>
        </div>
      </div>
    </div>
  )
}
