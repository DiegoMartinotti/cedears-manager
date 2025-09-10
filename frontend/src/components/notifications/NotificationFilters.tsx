import { X } from 'lucide-react'
import {
  NotificationFilters as NotificationFiltersType,
  NotificationFilterProps,
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG,
  NotificationType,
  NotificationPriority
} from '../../types/notification'

export default function NotificationFilters({ 
  filters, 
  onFiltersChange, 
  stats 
}: NotificationFilterProps) {
  const updateFilter = <K extends keyof NotificationFiltersType>(
    key: K,
    value: NotificationFiltersType[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const removeFilter = <K extends keyof NotificationFiltersType>(key: K) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const hasFilters = Object.keys(filters).length > 0

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      <div className="space-y-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Filtros</h3>
          {hasFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Limpiar todos
            </button>
          )}
        </div>

        {/* Active Filters */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (value === undefined) return null

              let displayValue = String(value)
              if (key === 'type' && NOTIFICATION_TYPE_CONFIG[value as NotificationType]) {
                displayValue = NOTIFICATION_TYPE_CONFIG[value as NotificationType].label
              } else if (key === 'priority' && NOTIFICATION_PRIORITY_CONFIG[value as NotificationPriority]) {
                displayValue = NOTIFICATION_PRIORITY_CONFIG[value as NotificationPriority].label
              } else if (key === 'isRead') {
                displayValue = value ? 'Leídas' : 'No leídas'
              } else if (key === 'isArchived') {
                displayValue = value ? 'Archivadas' : 'Activas'
              }

              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                >
                  {displayValue}
                  <button
                    onClick={() => removeFilter(key as keyof NotificationFiltersType)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Filter Controls */}
        <div className="grid grid-cols-1 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Tipo de notificación
            </label>
              <select
              value={filters.type || ''}
              onChange={(e) => updateFilter('type', e.target.value ? (e.target.value as NotificationType) : undefined)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(NOTIFICATION_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label} {stats?.byType[key as NotificationType] ? `(${stats.byType[key as NotificationType]})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Prioridad
            </label>
              <select
              value={filters.priority || ''}
              onChange={(e) => updateFilter('priority', e.target.value ? (e.target.value as NotificationPriority) : undefined)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las prioridades</option>
              {Object.entries(NOTIFICATION_PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label} {stats?.byPriority[key as NotificationPriority] ? `(${stats.byPriority[key as NotificationPriority]})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Read Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Estado de lectura
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('isRead', filters.isRead === false ? undefined : false)}
                className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                  filters.isRead === false
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                No leídas {stats ? `(${stats.unread})` : ''}
              </button>
              <button
                onClick={() => updateFilter('isRead', filters.isRead === true ? undefined : true)}
                className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                  filters.isRead === true
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Leídas {stats ? `(${stats.total - stats.unread})` : ''}
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-700">
              Rango de fechas
            </label>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={filters.dateFrom ? filters.dateFrom.split('T')[0] : ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={filters.dateTo ? filters.dateTo.split('T')[0] : ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Filtros rápidos
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  updateFilter('dateFrom', today.toISOString())
                  removeFilter('dateTo')
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Hoy
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date()
                  yesterday.setDate(yesterday.getDate() - 1)
                  yesterday.setHours(0, 0, 0, 0)
                  updateFilter('dateFrom', yesterday.toISOString())
                  removeFilter('dateTo')
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Ayer
              </button>
              <button
                onClick={() => {
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  weekAgo.setHours(0, 0, 0, 0)
                  updateFilter('dateFrom', weekAgo.toISOString())
                  removeFilter('dateTo')
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Última semana
              </button>
              <button
                onClick={() => {
                  const monthAgo = new Date()
                  monthAgo.setMonth(monthAgo.getMonth() - 1)
                  monthAgo.setHours(0, 0, 0, 0)
                  updateFilter('dateFrom', monthAgo.toISOString())
                  removeFilter('dateTo')
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Último mes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}