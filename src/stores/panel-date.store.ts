import { create } from 'zustand'
import { startOfDay, isToday, format } from 'date-fns'

interface PanelDateState {
  /** The currently selected date for the right task panel */
  selectedDate: Date
  /** Set the selected date */
  setSelectedDate: (date: Date) => void
  /** Jump to today */
  goToToday: () => void
}

export const usePanelDateStore = create<PanelDateState>((set) => ({
  selectedDate: startOfDay(new Date()),

  setSelectedDate: (date) => set({ selectedDate: startOfDay(date) }),

  goToToday: () => set({ selectedDate: startOfDay(new Date()) }),
}))

/** Selector: whether the current selection is today */
export const useIsPanelToday = () => usePanelDateStore((s) => isToday(s.selectedDate))

/** Selector: formatted date string (yyyy-MM-dd) */
export const usePanelDateString = () =>
  usePanelDateStore((s) => format(s.selectedDate, 'yyyy-MM-dd'))
