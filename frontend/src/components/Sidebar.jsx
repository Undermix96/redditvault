import { useStore } from '../stores/useStore'
import { useSubreddits } from '../hooks/useApi'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { activeSubreddit, setSubreddit, sidebarOpen } = useStore()
  const { data: subreddits = [], isLoading } = useSubreddits()

  return (
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Browse</p>
        <button
          className={`${styles.item} ${activeSubreddit === 'all' ? styles.active : ''}`}
          onClick={() => setSubreddit('all')}
        >
          <span className={styles.itemIcon}>◈</span>
          <span className={styles.itemName}>All</span>
          <span className={styles.itemCount}>
            {subreddits.reduce((s, r) => s + r.postCount, 0)}
          </span>
        </button>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Subreddits</p>
        {isLoading && (
          <div className={styles.skeleton}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={styles.skeletonItem} style={{ '--d': i * 0.05 + 's' }} />
            ))}
          </div>
        )}
        {subreddits.map(sub => (
          <button
            key={sub.name}
            className={`${styles.item} ${activeSubreddit === sub.name ? styles.active : ''}`}
            onClick={() => setSubreddit(sub.name)}
          >
            <span className={styles.itemAvatar}>{sub.name[0].toUpperCase()}</span>
            <span className={styles.itemName}>r/{sub.name}</span>
            <span className={styles.itemCount}>{sub.postCount}</span>
          </button>
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerText}>MediaVault · LAN</span>
      </div>
    </aside>
  )
}
