import React, { useState } from 'react'
import { 
  Clock,
  ExternalLink,
  MoreHorizontal,
  Check,
  Archive,
  Trash2,
  AlertTriangle,
  Zap,
  Target,
  Leaf,
  Briefcase,
  Settings,
  TrendingDown,
  Eye
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  NotificationItemProps, 
  NOTIFICATION_TYPE_CONFIG, 
  NOTIFICATION_PRIORITY_CONFIG 
} from '../../types/notification'

const iconMap = {
  Zap,
  AlertTriangle,
  Target,
  Leaf,
  Briefcase,
  Settings,
  TrendingDown,
  Eye
}

interface NotificationItemFullProps extends NotificationItemProps {
  isSelected?: boolean
  onSelectionChange?: (selected: boolean) => void
  showCheckbox?: boolean
}

export default function NotificationItem({
  notification,
  onRead,
  onArchive,
  onDelete,
  onAction,
  isSelected = false,
  onSelectionChange,
  showCheckbox = false
}: NotificationItemFullProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type]
  const priorityConfig = NOTIFICATION_PRIORITY_CONFIG[notification.priority]
  const IconComponent = iconMap[typeConfig.icon as keyof typeof iconMap] || AlertTriangle

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: es 
      })
    } catch {
      return 'hace un momento'
    }
  }

  const handleAction = async (action: () => Promise<any> | any) => {
    setIsLoading(true)
    try {
      await action()
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false)
      setShowMenu(false)
    }
  }

  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      handleAction(() => onRead(notification.id))
    }
  }

  const handleMainClick = () => {
    handleMarkAsRead()
    if (onAction) {
      onAction(notification)
    }
  }

  const parsedData = notification.data ? JSON.parse(notification.data) : null

  return (
    <div 
      className={`
        relative p-4 hover:bg-gray-50 transition-colors border-l-2
        ${notification.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-500'}
        ${priorityConfig.borderColor}
        ${notification.priority === 'CRITICAL' ? 'animate-pulse' : ''}
      `}
    >
      {/* Selection Checkbox */}
      {showCheckbox && (
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectionChange?.(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
        </div>
      )}

      <div className={`${showCheckbox ? 'ml-6' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div className={`flex-shrink-0 ${typeConfig.color} mt-0.5`}>
              <IconComponent className="w-5 h-5" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 
                  className={`font-medium text-sm leading-tight cursor-pointer hover:text-blue-600 ${
                    notification.isRead ? 'text-gray-900' : 'text-gray-900 font-semibold'
                  }`}
                  onClick={handleMainClick}
                >
                  {notification.title}
                </h4>
                
                {/* Priority Badge */}
                {notification.priority !== 'MEDIUM' && (
                  <span 
                    className={`
                      inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded
                      ${priorityConfig.color} ${priorityConfig.bgColor}
                    `}
                  >
                    {priorityConfig.label}
                  </span>
                )}
                
                {/* Unread Indicator */}
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                )}
              </div>
              
              <p 
                className={`text-sm leading-relaxed cursor-pointer hover:text-gray-700 ${
                  notification.isRead ? 'text-gray-600' : 'text-gray-700'
                }`}
                onClick={handleMainClick}
              >
                {notification.message}
              </p>
              
              {/* Additional Data */}
              {parsedData && (
                <div className="mt-2 text-xs text-gray-500">
                  {parsedData.symbol && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded mr-2">
                      <span className="font-medium">{parsedData.symbol}</span>
                    </span>
                  )}
                  {parsedData.score && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded mr-2">
                      Score: {parsedData.score}
                    </span>
                  )}
                  {parsedData.gainPercentage && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">
                      +{parsedData.gainPercentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            {/* Action Button */}
            {notification.actionUrl && (
              <button
                onClick={handleMainClick}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Ver detalles"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            
            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <div className="py-1">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleAction(() => onRead(notification.id))}
                        disabled={isLoading}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Marcar como leída
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleAction(() => onArchive(notification.id))}
                      disabled={isLoading}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      Archivar
                    </button>
                    
                    <button
                      onClick={() => handleAction(() => onDelete(notification.id))}
                      disabled={isLoading}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(notification.createdAt)}
            </span>
            
            <span className={`px-2 py-1 rounded ${typeConfig.color} bg-gray-100`}>
              {typeConfig.label}
            </span>
          </div>
          
          {/* Expiration Warning */}
          {notification.expiresAt && (
            <span className="text-amber-600 font-medium">
              Expira {formatTime(notification.expiresAt)}
            </span>
          )}
        </div>
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}
      
      {/* Click away handler for menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}

/**
 * Compact version for use in small spaces
 */
export function NotificationItemCompact({
  notification,
  onRead,
  onAction
}: Pick<NotificationItemFullProps, 'notification' | 'onRead' | 'onAction'>) {
  const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type]
  const IconComponent = iconMap[typeConfig.icon as keyof typeof iconMap] || AlertTriangle

  const handleClick = () => {
    if (!notification.isRead && onRead) {
      onRead(notification.id)
    }
    if (onAction) {
      onAction(notification)
    }
  }

  return (
    <div 
      className={`
        p-3 cursor-pointer hover:bg-gray-50 transition-colors border-l-2
        ${notification.isRead ? 'border-gray-200' : 'border-blue-500 bg-blue-50'}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${typeConfig.color}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-tight ${
            notification.isRead ? 'text-gray-900' : 'text-gray-900 font-semibold'
          }`}>
            {notification.title}
          </p>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
            </span>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}