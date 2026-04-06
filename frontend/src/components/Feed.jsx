import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { useStore } from '../stores/useStore'
import { usePosts } from '../hooks/useApi'
import MediaCard from './MediaCard'
import styles from './Feed.module.css'

export default function Feed() {
  const { activeSubreddit, activeType, openLightbox } = useStore()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = usePosts({
    subreddit: activeSubreddit,
    type: activeType,
  })

  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const allPosts = data?.pages.flatMap(p => p.posts) ?? []

  const handleOpen = (post, index) => openLightbox(post, allPosts, index)

  if (isLoading) return (
    <div className={styles.feed}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className={styles.skeletonCard}
          style={{ '--d': i * 0.08 + 's', '--h': (280 + (i % 2) * 60) + 'px' }} />
      ))}
    </div>
  )

  if (isError) return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>⚠</span>
      <p>Errore nel caricamento dei media.</p>
    </div>
  )

  if (allPosts.length === 0) return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>◻</span>
      <p>Nessun media trovato.</p>
    </div>
  )

  return (
    <div>
      <div className={styles.feed}>
        {allPosts.map((post, i) => (
          <MediaCard
            key={post.id}
            post={post}
            index={i}
            onClick={() => handleOpen(post, i)}
          />
        ))}
      </div>
      <div ref={sentinelRef} className={styles.sentinel}>
        {isFetchingNextPage && (
          <div className={styles.loadingMore}>
            <span /><span /><span />
          </div>
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <p className={styles.endMessage}>— {allPosts.length} media —</p>
        )}
      </div>
    </div>
  )
}
