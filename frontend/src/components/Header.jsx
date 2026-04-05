import { useStore } from '../stores/useStore'
import styles from './Header.module.css'

const TypeFilters = ['all', 'image', 'video', 'gif']

export default function Header() {
  const { activeType, setType, setSidebarOpen, sidebarOpen, activeSubreddit } = useStore()

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <span /><span /><span />
        </button>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>▲</span>
          <span className={styles.logoText}>RedditVault</span>
        </div>
        {activeSubreddit !== 'all' && (
          <div className={styles.subredditBadge}>
            <span className={styles.rSlash}>r/</span>{activeSubreddit}
          </div>
        )}
      </div>

      <nav className={styles.typeNav}>
        {TypeFilters.map(t => (
          <button
            key={t}
            className={`${styles.typeBtn} ${activeType === t ? styles.active : ''}`}
            onClick={() => setType(t)}
          >
            {t === 'all' ? 'All' : t === 'gif' ? 'GIF' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
    </header>
  )
}
