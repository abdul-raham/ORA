import { create } from 'zustand'

// Whether the first-visit studio intro is still playing. The hero holds its
// own entrance until the intro hands over.

const played = () => {
  try {
    return sessionStorage.getItem('ora.intro') === '1'
  } catch {
    return true
  }
}

interface UiState {
  introDone: boolean
  finishIntro: () => void
}

export const useUi = create<UiState>()((set) => ({
  introDone: played() || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  finishIntro: () => {
    try {
      sessionStorage.setItem('ora.intro', '1')
    } catch {
      // Replays next time; harmless.
    }
    set({ introDone: true })
  },
}))
