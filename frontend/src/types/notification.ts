export type NotificationType = 
  | 'OPPORTUNITY' 
  | 'ALERT' 
  | 'GOAL_PROGRESS' 
  | 'ESG_CHANGE' 
  | 'PORTFOLIO_UPDATE' 
  | 'SYSTEM' 
  | 'SELL_SIGNAL' 
  | 'WATCHLIST_CHANGE'

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface NotificationData {
  id: number
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data?: string // JSON string
  isRead: boolean
  isArchived: boolean
  sourceId?: number
  sourceType?: string
  actionType?: string
  actionUrl?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateNotificationData {
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data?: any // Will be JSON stringified
  sourceId?: number
  sourceType?: string
  actionType?: string
  actionUrl?: string
  expiresAt?: string
}

export interface NotificationFilters {
  type?: NotificationType
  priority?: NotificationPriority
  isRead?: boolean
  isArchived?: boolean
  sourceType?: string
  dateFrom?: string
  dateTo?: string
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
  recentCount: number // Last 24 hours
}

export interface NotificationSummary {
  stats: NotificationStats
  recent: NotificationData[]
  highPriority: NotificationData[]
  unreadCount: number
}

export interface NotificationsResponse {
  success: boolean
  data: {
    notifications: NotificationData[]
    total: number
    hasMore: boolean
    page: number
    pageSize: number
  }
}

export interface NotificationStatsResponse {
  success: boolean
  data: NotificationStats
}

export interface NotificationSummaryResponse {
  success: boolean
  data: NotificationSummary
}

export interface UnreadCountResponse {
  success: boolean
  data: { count: number }
}

// UI-specific types
export interface NotificationItemProps {
  notification: NotificationData
  onRead: (id: number) => void
  onArchive: (id: number) => void
  onDelete: (id: number) => void
  onAction?: (notification: NotificationData) => void
}

export interface NotificationFilterProps {
  filters: NotificationFilters
  onFiltersChange: (filters: NotificationFilters) => void
  stats: NotificationStats
}

export interface NotificationBadgeProps {
  count: number
  maxDisplay?: number
  showZero?: boolean
}

// Notification type configurations
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  label: string
  icon: string
  color: string
  description: string
}> = {
  OPPORTUNITY: {
    label: 'Oportunidad',
    icon: 'Zap',
    color: 'text-yellow-600',
    description: 'Oportunidades de compra detectadas'
  },
  ALERT: {
    label: 'Alerta',
    icon: 'AlertTriangle',
    color: 'text-orange-600',
    description: 'Alertas generales del sistema'
  },
  GOAL_PROGRESS: {
    label: 'Progreso',
    icon: 'Target',
    color: 'text-blue-600',
    description: 'Progreso en objetivos financieros'
  },
  ESG_CHANGE: {
    label: 'ESG/Vegan',
    icon: 'Leaf',
    color: 'text-green-600',
    description: 'Cambios en criterios ESG/Vegan'
  },
  PORTFOLIO_UPDATE: {
    label: 'Cartera',
    icon: 'Briefcase',
    color: 'text-purple-600',
    description: 'Actualizaciones de cartera'
  },
  SYSTEM: {
    label: 'Sistema',
    icon: 'Settings',
    color: 'text-gray-600',
    description: 'Notificaciones del sistema'
  },
  SELL_SIGNAL: {
    label: 'Venta',
    icon: 'TrendingDown',
    color: 'text-red-600',
    description: 'Señales de venta'
  },
  WATCHLIST_CHANGE: {
    label: 'Watchlist',
    icon: 'Eye',
    color: 'text-indigo-600',
    description: 'Cambios en el watchlist'
  }
}

export const NOTIFICATION_PRIORITY_CONFIG: Record<NotificationPriority, {
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  LOW: {
    label: 'Baja',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  MEDIUM: {
    label: 'Media',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  HIGH: {
    label: 'Alta',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  CRITICAL: {
    label: 'Crítica',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
}