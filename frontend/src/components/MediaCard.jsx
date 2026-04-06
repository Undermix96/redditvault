import { useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import styles from './MediaCard.module.css'

const TYPE_BADGE = { video: '▶', gif: 'GIF', image: '⬜' }
const TYPE_COLOR = { video: 'var(--accent)', gif: 'var(--purple)', image: 'var(--blue)' }

export default function MediaCard({ post, onClick, index }) {
  const videoRef = useRef(null)
  const [loaded, setLoaded]   = useState(false)
  const [errored, setErrored] = useState(false)

  // Only MP4/WebM videos get autoplay via IntersectionObserver
  const isVideo = post.type === 'video'
  // GIFs rendered as <img> — browser loops them natively, no JS needed
  const isGif   = post.type === 'gif'

  const { ref: inViewRef } = useInView({
    threshold: 0.2,
    onChange: (inView) => {
      if (!isVideo || !videoRef.current) return
      if (inView) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  })

  return (
    <article
      className={styles.card}
      style={{ '--anim-delay': `${Math.min(index, 8) * 0.04}s` }}
      onClick={onClick}
    >
      <div className={styles.mediaWrap} ref={inViewRef}>
        {!errored ? (
          isVideo ? (
            /* MP4/WebM — muted autoplay in feed */
            <video
              ref={videoRef}
              src={post.url}
              className={`${styles.mediaVideo} ${loaded ? styles.visible : ''}`}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              onLoadedData={() => setLoaded(true)}
              onError={() => setErrored(true)}
            />
          ) : (
            /* GIF + image — both rendered as <img>.
               GIFs animate automatically, images load lazily. */
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
          <div className={styles.errorMedia}><span>⚠</span></div>
        )}

        {!loaded && !errored && <div className={styles.placeholder} />}

        <div className={styles.overlay}>
          <span className={styles.typeBadge} style={{ '--tc': TYPE_COLOR[post.type] }}>
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
