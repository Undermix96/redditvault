import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { useStore } from '../stores/useStore'
import { usePosts } from '../hooks/useApi'
import MediaCard from './MediaCard'
import AlbumCard from './AlbumCard'
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

  // Build the flat list used by the lightbox for prev/next navigation.
  // Albums are expanded so each image is a separate lightbox entry.
  const lightboxList = allPosts.flatMap(post =>
    post.type === 'album'
      ? post.images.map(img => ({ ...img, subreddit: post.subreddit, category: post.category, type: 'image' }))
      : [post]
  )

  const handleOpenSingle = (post, postIndex) => {
    // Find where this post sits in the flat lightboxList
    let offset = 0
    for (let i = 0; i < postIndex; i++) {
      const p = allPosts[i]
      offset += p.type === 'album' ? p.images.length : 1
    }
    openLightbox(lightboxList[offset], lightboxList, offset)
  }

  const handleOpenAlbum = (post, postIndex, imageIndex) => {
    let offset = 0
    for (let i = 0; i < postIndex; i++) {
      const p = allPosts[i]
      offset += p.type === 'album' ? p.images.length : 1
    }
    const idx = offset + imageIndex
    openLightbox(lightboxList[idx], lightboxList, idx)
  }

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
        {allPosts.map((post, i) =>
          post.type === 'album' ? (
            <AlbumCard
              key={post.id}
              post={post}
              index={i}
              onOpen={(imgIndex) => handleOpenAlbum(post, i, imgIndex)}
            />
          ) : (
            <MediaCard
              key={post.id}
              post={post}
              index={i}
              onClick={() => handleOpenSingle(post, i)}
            />
          )
        )}
      </div>
      <div ref={sentinelRef} className={styles.sentinel}>
        {isFetchingNextPage && (
          <div className={styles.loadingMore}><span /><span /><span /></div>
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <p className={styles.endMessage}>— {allPosts.length} post —</p>
        )}
      </div>
    </div>
  )
}
