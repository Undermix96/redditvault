import { useState, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import styles from './AlbumCard.module.css'

export default function AlbumCard({ post, index, onOpen }) {
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded]   = useState({})
  const touchStartX = useRef(null)

  const images = post.images
  const total  = images.length

  const { ref: inViewRef } = useInView({ threshold: 0.1 })

  const prev = (e) => {
    e.stopPropagation()
    setCurrent(c => (c - 1 + total) % total)
  }
  const next = (e) => {
    e.stopPropagation()
    setCurrent(c => (c + 1) % total)
  }
  const goTo = (i, e) => {
    e.stopPropagation()
    setCurrent(i)
  }

  // Swipe support on the card image area
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) setCurrent(c => (c + 1) % total)
      else         setCurrent(c => (c - 1 + total) % total)
    }
    touchStartX.current = null
  }

  const img = images[current]

  return (
    <article
      className={styles.card}
      style={{ '--anim-delay': `${Math.min(index, 8) * 0.04}s` }}
      onClick={() => onOpen(current)}
    >
      <div
        className={styles.mediaWrap}
        ref={inViewRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((im, i) => (
          <img
            key={im.id}
            src={im.url}
            alt={im.title}
            className={`${styles.slide} ${i === current ? styles.active : ''} ${loaded[i] ? styles.loaded : ''}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(l => ({ ...l, [i]: true }))}
          />
        ))}

        {!loaded[current] && <div className={styles.placeholder} />}

        {/* Prev / Next arrows */}
        {total > 1 && (
          <>
            <button className={`${styles.arrow} ${styles.arrowPrev}`} onClick={prev} aria-label="Precedente">‹</button>
            <button className={`${styles.arrow} ${styles.arrowNext}`} onClick={next} aria-label="Successivo">›</button>
          </>
        )}

        {/* Top-right badges */}
        <div className={styles.badges}>
          <span className={styles.albumBadge}>⊞ {current + 1}/{total}</span>
        </div>

        {/* Dot indicators */}
        {total > 1 && total <= 10 && (
          <div className={styles.dots}>
            {images.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
                onClick={(e) => goTo(i, e)}
                aria-label={`Immagine ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Expand icon */}
        <div className={styles.expandOverlay}>
          <span className={styles.expandIcon}>⤢</span>
        </div>
      </div>

      <div className={styles.meta}>
        <p className={styles.title}>{post.title}</p>
        <div className={styles.tags}>
          <span className={styles.subreddit}>r/{post.subreddit}</span>
          <span className={styles.category}>{post.category}</span>
        </div>
      </div>
    </article>
  )
}
