import { create } from 'zustand'

// Whether the studio intro is still playing. It plays on every full load of
// the home page (including refresh), but not when navigating within the site
// or when the visitor prefers reduced motion. The hero holds its own entrance
// until the intro hands over.

const skipIntro = () => {
  if (typeof window === 'undefined') return true
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true
  return window.location.pathname !== '/'
}

interface UiState {
  introDone: boolean
  finishIntro: () => void
}

export const useUi = create<UiState>()((set) => ({
  introDone: skipIntro(),
  finishIntro: () => set({ introDone: true }),
}))
