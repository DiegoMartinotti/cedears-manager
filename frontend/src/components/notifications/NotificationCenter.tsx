import { useState } from 'react'
import {
  Bell,
  Search,
  Filter,
  MoreHorizontal,
  CheckCheck,
  X,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react'
import {
  useNotifications,
  useNotificationActions,
  useNotificationFilters,
  useNotificationSearch,
  useNotificationSummary
} from '../../hooks/useNotifications'
import { NotificationData, NotificationFilters as NotificationFiltersType, NotificationStats } from '../../types/notification'
import NotificationItem from './NotificationItem'
import NotificationFiltersComponent from './NotificationFilters'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const { filters, updateFilter, clearFilters, hasFilters } = useNotificationFilters()
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useNotificationSearch()
  
  const pageSize = 20
  const {
    notifications,
    total,
    hasMore,
    isLoading,
    error,
    refetch
  } = useNotifications(filters, currentPage, pageSize, searchQuery)

  const { data: summary } = useNotificationSummary()
  
  const {
    selectedIds,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    archive,
    delete: deleteNotification,
    onSelectionChange,
    deselectAll,
    isLoading: isActionLoading
  } = useNotificationActions()

  const displayNotifications = searchQuery ? searchResults : notifications

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1)
  }

  const handleNotificationAction = (notification: NotificationData) => {
    // Mark as read when clicking action
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    
    // Navigate to action URL if provided
    if (notification.actionUrl) {
      onClose()
      // Navigation will be handled by parent component
      window.dispatchEvent(
        new CustomEvent('notification-action', {
          detail: { notification }
        })
      )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-25"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Notificaciones
              </h2>
              {summary && (
                <span className="text-sm text-gray-500">
                  ({summary.unreadCount} sin leer)
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Search Toggle */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-1 rounded hover:bg-gray-100 ${showSearch ? 'bg-gray-100' : ''}`}
              >
                <Search className="w-4 h-4" />
              </button>
              
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1 rounded hover:bg-gray-100 ${showFilters || hasFilters ? 'bg-gray-100' : ''}`}
              >
                <Filter className="w-4 h-4" />
                {hasFilters && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>
              
              {/* Actions Menu */}
              <div className="relative">
                <button className="p-1 rounded hover:bg-gray-100">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              
              {/* Close */}
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar notificaciones..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="border-b border-gray-200">
              <NotificationFiltersComponent
                filters={filters}
                onFiltersChange={(newFilters: NotificationFiltersType) => {
                  Object.entries(newFilters).forEach(([key, value]) => {
                    updateFilter(
                      key as keyof NotificationFiltersType,
                      value as NotificationFiltersType[keyof NotificationFiltersType]
                    )
                  })
                  setCurrentPage(1)
                }}
                stats={summary?.stats as NotificationStats}
              />
            </div>
          )}

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="p-4 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedIds.length} seleccionadas
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markMultipleAsRead(selectedIds)}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    Marcar leídas
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {!searchQuery && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => markAllAsRead(filters)}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas como leídas
                </button>
                {hasFilters && (
                  <button
                    onClick={() => {
                      clearFilters()
                      setCurrentPage(1)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-gray-600 hover:bg-gray-50 rounded-md"
                  >
                    <X className="w-4 h-4" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Error al cargar notificaciones</span>
                </div>
                <button
                  onClick={() => refetch()}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}

            {isLoading && currentPage === 1 && (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Cargando notificaciones...</p>
              </div>
            )}

            {!isLoading && displayNotifications.length === 0 && (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'Sin resultados' : 'Sin notificaciones'}
                </h3>
                <p className="text-sm text-gray-600">
                  {searchQuery 
                    ? `No se encontraron notificaciones para "${searchQuery}"`
                    : 'No tienes notificaciones en este momento'
                  }
                </p>
              </div>
            )}

            {/* Notifications List */}
            <div className="divide-y divide-gray-100">
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onArchive={archive}
                  onDelete={deleteNotification}
                  onAction={handleNotificationAction}
                  isSelected={selectedIds.includes(notification.id)}
                  onSelectionChange={(selected) => onSelectionChange(notification.id, selected)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && !searchQuery && (
              <div className="p-4 text-center border-t border-gray-100">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Cargar más'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {total} notificaciones total
              </span>
              <span>
                Página {currentPage}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}