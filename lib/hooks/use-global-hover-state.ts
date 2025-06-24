import { create } from 'zustand'

interface HoverInfo {
  cellId: string
  offsetY: number
  exactTime: string
  granularityType?: 'normal' | 'blue' | 'green'
}

interface GlobalHoverState {
  hoveredInfo: HoverInfo | null
  setHoveredInfo: (info: HoverInfo | null) => void
  clearHover: () => void
}

export const useGlobalHoverState = create<GlobalHoverState>((set) => ({
  hoveredInfo: null,
  setHoveredInfo: (info) => set({ hoveredInfo: info }),
  clearHover: () => set({ hoveredInfo: null })
}))
