import { useRef, useEffect, useState } from 'react'
import { useStore } from '../stores/useStore'
import styles from './Lightbox.module.css'

export default function Lightbox() {
  const { lightboxPost, lightboxIndex, lightboxList, closeLightbox, lightboxNext, lightboxPrev } = useStore()
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef(null)

  const isVideo = lightboxPost?.type === 'video' || lightboxPost?.type === 'gif'
  const hasPrev = lightboxIndex > 0
  const hasNext = lightboxIndex < lightboxList.length - 1

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Autoplay when post changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [lightboxPost])

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Auto-hide UI overlays after 3s of no mouse movement
  const resetHideTimer = () => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }

  useEffect(() => {
    resetHideTimer()
    return () => clearTimeout(hideTimer.current)
  }, [lightboxPost])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.()
    } else {
      await document.exitFullscreen?.()
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) closeLightbox()
  }

  if (!lightboxPost) return null

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      onMouseMove={resetHideTimer}
    >
      <div
        ref={containerRef}
        className={`${styles.container} ${showControls ? styles.showControls : ''}`}
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

        {/* Media area */}
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
              className={styles.media}
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Prev / Next arrows — shown only for images (video has native controls) */}
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

        {/* Bottom bar */}
        <div className={styles.bottomBar}>
          <div className={styles.bottomLeft} />
          <div className={styles.dotNav}>
            {lightboxList.length <= 30 && lightboxList.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === lightboxIndex ? styles.dotActive : ''}`}
                onClick={() => useStore.getState().openLightbox(lightboxList[i], lightboxList, i)}
                aria-label={`Vai al media ${i + 1}`}
              />
            ))}
          </div>
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
