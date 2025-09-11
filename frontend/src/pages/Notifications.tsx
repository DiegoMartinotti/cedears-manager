import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings, RefreshCw } from 'lucide-react'
import { 
  useNotificationSummary, 
  useNotificationActions,
  useNotificationStats
} from '../hooks/useNotifications'
import NotificationCenter from '../components/notifications/NotificationCenter'
import NotificationBadge from '../components/notifications/NotificationBadge'
import { NotificationData } from '../types/notification'

export default function Notifications() {
  const [showNotificationCenter, setShowNotificationCenter] = useState(true)
  const navigate = useNavigate()
  
  const { data: summary, isLoading, refetch } = useNotificationSummary()
  const { data: stats } = useNotificationStats()
  const { markAllAsRead, isLoading: actionsLoading } = useNotificationActions()
  const unreadCount = summary?.stats.unread ?? 0

  // Handle notification action events
  useEffect(() => {
    const handleNotificationAction = (event: CustomEvent<{ notification: NotificationData }>) => {
      const { notification } = event.detail
      
      if (notification.actionUrl) {
        // Navigate to the specified URL
        const url = notification.actionUrl
        if (url.startsWith('/')) {
          navigate(url)
        } else if (url.startsWith('http')) {
          window.open(url, '_blank')
        }
      }
    }

    window.addEventListener('notification-action', handleNotificationAction as EventListener)
    
    return () => {
      window.removeEventListener('notification-action', handleNotificationAction as EventListener)
    }
  }, [navigate])

  const handleRefresh = () => {
    refetch()
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch {
      // Error handled silently
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Centro de Notificaciones</h1>
              <p className="text-gray-600 mt-1">
                Mantente al día con todas las alertas y actualizaciones importantes
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationBadge size="lg" count={unreadCount} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.stats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sin leer</p>
                <p className="text-2xl font-bold text-blue-600">{summary?.stats.unread}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alta prioridad</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(summary?.stats.byPriority.HIGH || 0) + (summary?.stats.byPriority.CRITICAL || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Bell className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recientes (24h)</p>
                <p className="text-2xl font-bold text-green-600">{summary?.stats.recentCount}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Bell className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          
          <button
            onClick={handleMarkAllAsRead}
            disabled={actionsLoading || unreadCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Marcar todas como leídas
            {unreadCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
        </div>
      </div>

      {/* Notification Center */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Todas las notificaciones</h2>
        </div>
        
        <div className="relative">
          <NotificationCenter
            isOpen={showNotificationCenter}
            onClose={() => setShowNotificationCenter(false)}
          />
          
          {/* Embedded version for full page */}
          {!showNotificationCenter && (
            <div className="p-6">
              <button
                onClick={() => setShowNotificationCenter(true)}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <Bell className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">Abrir Centro de Notificaciones</p>
                <p className="text-sm mt-1">Ver todas las notificaciones en detalle</p>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Types Overview */}
      {stats && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución por tipo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {type === 'OPPORTUNITY' && 'Oportunidades'}
                  {type === 'ALERT' && 'Alertas'}
                  {type === 'GOAL_PROGRESS' && 'Objetivos'}
                  {type === 'ESG_CHANGE' && 'ESG/Vegan'}
                  {type === 'PORTFOLIO_UPDATE' && 'Cartera'}
                  {type === 'SYSTEM' && 'Sistema'}
                  {type === 'SELL_SIGNAL' && 'Señales venta'}
                  {type === 'WATCHLIST_CHANGE' && 'Watchlist'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}