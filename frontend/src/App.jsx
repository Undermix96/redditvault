import { useEffect } from 'react'
import { useStore } from './stores/useStore'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Feed from './components/Feed'
import Lightbox from './components/Lightbox'
import styles from './App.module.css'

export default function App() {
  const { lightboxPost, lightboxNext, lightboxPrev, closeLightbox, sidebarOpen, setSidebarOpen } = useStore()

  // Keyboard nav for lightbox
  useEffect(() => {
    const handler = (e) => {
      if (!lightboxPost) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') lightboxNext()
      if (e.key === 'ArrowLeft') lightboxPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxPost, lightboxNext, lightboxPrev, closeLightbox])

  return (
    <div className={`${styles.layout} ${sidebarOpen ? styles.sidebarVisible : ''}`}>
      <Header />
      <Sidebar />
      {/* Tap-to-close overlay behind sidebar on mobile */}
      {sidebarOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <main className={styles.main}>
        <Feed />
      </main>
      {lightboxPost && <Lightbox />}
    </div>
  )
}
