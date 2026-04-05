import { useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import styles from './MediaCard.module.css'

const TYPE_BADGE = { video: '▶', gif: 'GIF', image: '⬜' }
const TYPE_COLOR = { video: 'var(--accent)', gif: 'var(--purple)', image: 'var(--blue)' }

export default function MediaCard({ post, onClick, index }) {
  const videoRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const { ref: inViewRef } = useInView({
    threshold: 0.3,
    onChange: (inView) => {
      if (!videoRef.current) return
      if (inView) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  })

  const isVideo = post.type === 'video' || post.type === 'gif'
  const isGif = post.type === 'gif'

  return (
    <article
      className={styles.card}
      style={{ '--anim-delay': `${(index % 24) * 0.03}s` }}
      onClick={onClick}
    >
      <div className={styles.mediaWrap} ref={inViewRef}>
        {!errored ? (
          isVideo || isGif ? (
            <video
              ref={videoRef}
              src={post.url}
              className={`${styles.media} ${loaded ? styles.visible : ''}`}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              onLoadedData={() => setLoaded(true)}
              onError={() => setErrored(true)}
            />
          ) : (
            <img
              src={post.url}
              alt={post.title}
              className={`${styles.media} ${loaded ? styles.visible : ''}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
            />
          )
        ) : (
          <div className={styles.errorMedia}>
            <span>⚠</span>
          </div>
        )}

        {!loaded && !errored && <div className={styles.placeholder} />}

        <div className={styles.overlay}>
          <span
            className={styles.typeBadge}
            style={{ '--tc': TYPE_COLOR[post.type] }}
          >
            {TYPE_BADGE[post.type]}
          </span>
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
