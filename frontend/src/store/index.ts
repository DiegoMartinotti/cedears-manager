import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { 
  CEDEAR, 
  AppSettings, 
  Notification, 
  FinancialGoal,
  Trade 
} from '@cedears-manager/shared/types'

// Watchlist slice state
interface WatchlistState {
  instruments: CEDEAR[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Config slice state  
interface ConfigState {
  settings: AppSettings
  isOnline: boolean
  lastSync: Date | null
}

// UI slice state
interface UIState {
  notifications: Notification[]
  sidebarCollapsed: boolean
  activeModal: string | null
  theme: 'light' | 'dark' | 'system'
}

// Portfolio slice state
interface PortfolioState {
  trades: Trade[]
  goals: FinancialGoal[]
  totalValue: number
  totalReturn: number
  totalReturnPercent: number
  isLoading: boolean
}

// Combined store state
interface AppState {
  // Watchlist
  watchlist: WatchlistState
  addToWatchlist: (instrument: CEDEAR) => void
  removeFromWatchlist: (instrumentId: string) => void
  updateWatchlist: (instruments: CEDEAR[]) => void
  setWatchlistLoading: (loading: boolean) => void
  setWatchlistError: (error: string | null) => void

  // Config
  config: ConfigState
  updateSettings: (settings: Partial<AppSettings>) => void
  setOnlineStatus: (isOnline: boolean) => void
  updateLastSync: () => void

  // UI
  ui: UIState
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void
  removeNotification: (notificationId: string) => void
  markNotificationAsRead: (notificationId: string) => void
  toggleSidebar: () => void
  setActiveModal: (modalId: string | null) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Portfolio
  portfolio: PortfolioState
  addTrade: (trade: Trade) => void
  updateGoals: (goals: FinancialGoal[]) => void
  setPortfolioLoading: (loading: boolean) => void
}

// Default settings
const defaultSettings: AppSettings = {
  theme: 'system',
  language: 'es',
  currency: 'ARS',
  notifications: {
    priceAlerts: true,
    goalProgress: true,
    technicalSignals: true,
  },
  defaultCommission: '',
  refreshInterval: 300, // 5 minutes
  autoAnalysis: true,
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial watchlist state
      watchlist: {
        instruments: [],
        isLoading: false,
        error: null,
        lastUpdated: null,
      },

      // Initial config state
      config: {
        settings: defaultSettings,
        isOnline: true,
        lastSync: null,
      },

      // Initial UI state
      ui: {
        notifications: [],
        sidebarCollapsed: false,
        activeModal: null,
        theme: 'system',
      },

      // Initial portfolio state
      portfolio: {
        trades: [],
        goals: [],
        totalValue: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        isLoading: false,
      },

      // Watchlist actions
      addToWatchlist: (instrument: CEDEAR) =>
        set((state) => {
          const exists = state.watchlist.instruments.find(
            (item: CEDEAR) => item.id === instrument.id
          )
          if (!exists) {
            state.watchlist.instruments.push(instrument)
            state.watchlist.lastUpdated = new Date()
          }
        }),

      removeFromWatchlist: (instrumentId: string) =>
        set((state) => {
          state.watchlist.instruments = state.watchlist.instruments.filter(
            (item: CEDEAR) => item.id !== instrumentId
          )
          state.watchlist.lastUpdated = new Date()
        }),

      updateWatchlist: (instruments: CEDEAR[]) =>
        set((state) => {
          state.watchlist.instruments = instruments
          state.watchlist.lastUpdated = new Date()
          state.watchlist.error = null
        }),

      setWatchlistLoading: (loading: boolean) =>
        set((state) => {
          state.watchlist.isLoading = loading
        }),

      setWatchlistError: (error: string | null) =>
        set((state) => {
          state.watchlist.error = error
          state.watchlist.isLoading = false
        }),

      // Config actions
      updateSettings: (newSettings: Partial<AppSettings>) =>
        set((state) => {
          state.config.settings = { ...state.config.settings, ...newSettings }
        }),

      setOnlineStatus: (isOnline: boolean) =>
        set((state) => {
          state.config.isOnline = isOnline
        }),

      updateLastSync: () =>
        set((state) => {
          state.config.lastSync = new Date()
        }),

      // UI actions
      addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) =>
        set((state) => {
          const newNotification: Notification = {
            ...notification,
            id: crypto.randomUUID(),
            createdAt: new Date(),
          }
          state.ui.notifications.unshift(newNotification)
          
          // Keep only last 50 notifications
          if (state.ui.notifications.length > 50) {
            state.ui.notifications = state.ui.notifications.slice(0, 50)
          }
        }),

      removeNotification: (notificationId: string) =>
        set((state) => {
          state.ui.notifications = state.ui.notifications.filter(
            (notification) => notification.id !== notificationId
          )
        }),

      markNotificationAsRead: (notificationId: string) =>
        set((state) => {
          const notification = state.ui.notifications.find(
            (n: Notification) => n.id === notificationId
          )
          if (notification) {
            notification.isRead = true
          }
        }),

      toggleSidebar: () =>
        set((state) => {
          state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed
        }),

      setActiveModal: (modalId: string | null) =>
        set((state) => {
          state.ui.activeModal = modalId
        }),

      setTheme: (theme: 'light' | 'dark' | 'system') =>
        set((state) => {
          state.ui.theme = theme
          state.config.settings.theme = theme
        }),

      // Portfolio actions
      addTrade: (trade: Trade) =>
        set((state) => {
          state.portfolio.trades.push(trade)
          // TODO: Recalculate portfolio metrics
        }),

      updateGoals: (goals: FinancialGoal[]) =>
        set((state) => {
          state.portfolio.goals = goals
        }),

      setPortfolioLoading: (loading: boolean) =>
        set((state) => {
          state.portfolio.isLoading = loading
        }),
    })),
    {
      name: 'cedears-manager-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist certain parts of the state
        watchlist: {
          instruments: state.watchlist.instruments,
          lastUpdated: state.watchlist.lastUpdated,
        },
        config: state.config,
        ui: {
          sidebarCollapsed: state.ui.sidebarCollapsed,
          theme: state.ui.theme,
        },
        portfolio: {
          trades: state.portfolio.trades,
          goals: state.portfolio.goals,
        },
      }),
    }
  )
)