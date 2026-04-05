import { create } from 'zustand'

export const useStore = create((set) => ({
  activeSubreddit: 'all',
  activeType: 'all',
  lightboxPost: null,
  lightboxList: [],
  lightboxIndex: 0,
  sidebarOpen: true,

  setSubreddit: (name) => set({ activeSubreddit: name }),
  setType: (type) => set({ activeType: type }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  openLightbox: (post, list, index) => set({
    lightboxPost: post,
    lightboxList: list,
    lightboxIndex: index ?? 0
  }),
  closeLightbox: () => set({ lightboxPost: null, lightboxList: [], lightboxIndex: 0 }),
  lightboxNext: () => set((s) => {
    const next = Math.min(s.lightboxIndex + 1, s.lightboxList.length - 1)
    return { lightboxIndex: next, lightboxPost: s.lightboxList[next] }
  }),
  lightboxPrev: () => set((s) => {
    const prev = Math.max(s.lightboxIndex - 1, 0)
    return { lightboxIndex: prev, lightboxPost: s.lightboxList[prev] }
  }),
}))
