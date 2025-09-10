import { Bell, BellRing } from 'lucide-react'
import { useUnreadCount } from '../../hooks/useNotifications'
import { NotificationBadgeProps } from '../../types/notification'

interface NotificationBadgeFullProps extends NotificationBadgeProps {
  onClick?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function NotificationBadge({ 
  count: externalCount, 
  maxDisplay = 99, 
  showZero = false,
  onClick,
  className = '',
  size = 'md'
}: NotificationBadgeFullProps) {
  // If no external count provided, use the hook
  const { data: hookCount = 0 } = useUnreadCount()
  const count = externalCount !== undefined ? externalCount : hookCount

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : count.toString()
  const shouldShow = count > 0 || showZero

  const sizeClasses = {
    sm: {
      icon: 'w-4 h-4',
      badge: 'text-xs px-1.5 py-0.5 min-w-[18px] h-[18px]',
      container: 'relative'
    },
    md: {
      icon: 'w-5 h-5',
      badge: 'text-xs px-2 py-1 min-w-[20px] h-[20px]',
      container: 'relative'
    },
    lg: {
      icon: 'w-6 h-6',
      badge: 'text-sm px-2.5 py-1 min-w-[24px] h-[24px]',
      container: 'relative'
    }
  }

  const sizeConfig = sizeClasses[size]

  return (
    <div 
      className={`${sizeConfig.container} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Bell Icon */}
      {count > 0 ? (
        <BellRing className={`${sizeConfig.icon} text-orange-600`} />
      ) : (
        <Bell className={`${sizeConfig.icon} text-muted-foreground`} />
      )}
      
      {/* Badge */}
      {shouldShow && (
        <span 
          className={`
            absolute -top-2 -right-2 
            ${sizeConfig.badge}
            ${count > 0 ? 'bg-red-500 text-white' : 'bg-gray-400 text-white'}
            rounded-full font-medium
            flex items-center justify-center
            border-2 border-white
            shadow-sm
            animate-in zoom-in-50 duration-200
          `}
          title={`${count} notificaciones sin leer`}
        >
          {displayCount}
        </span>
      )}
    </div>
  )
}

/**
 * Simple badge for inline use (just the number)
 */
export function NotificationBadgeSimple({ 
  count: externalCount,
  maxDisplay = 99,
  showZero = false,
  className = ''
}: NotificationBadgeProps & { className?: string }) {
  const { data: hookCount = 0 } = useUnreadCount()
  const count = externalCount !== undefined ? externalCount : hookCount

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : count.toString()
  const shouldShow = count > 0 || showZero

  if (!shouldShow) return null

  return (
    <span 
      className={`
        inline-flex items-center justify-center
        px-2 py-1 text-xs font-medium
        ${count > 0 ? 'bg-red-500 text-white' : 'bg-gray-400 text-white'}
        rounded-full min-w-[20px] h-5
        ${className}
      `}
      title={`${count} notificaciones sin leer`}
    >
      {displayCount}
    </span>
  )
}

/**
 * Badge for navigation items
 */
export function NavigationNotificationBadge() {
  const { data: count = 0, isLoading } = useUnreadCount()

  if (isLoading) {
    return (
      <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse" />
    )
  }

  if (count === 0) return null

  const displayCount = count > 99 ? '99+' : count.toString()

  return (
    <span 
      className="
        inline-flex items-center justify-center
        px-1.5 py-0.5 text-xs font-bold
        bg-red-500 text-white
        rounded-full min-w-[18px] h-[18px]
        animate-pulse
      "
      title={`${count} notificaciones sin leer`}
    >
      {displayCount}
    </span>
  )
}

/**
 * Pulse animation for high priority notifications
 */
export function NotificationBadgeWithPulse({ 
  count: externalCount,
  hasCritical = false,
  ...props 
}: NotificationBadgeFullProps & { hasCritical?: boolean }) {
  const { data: hookCount = 0 } = useUnreadCount()
  const count = externalCount !== undefined ? externalCount : hookCount

  return (
    <div className="relative">
      <NotificationBadge count={count} {...props} />
      
      {/* Pulse effect for critical notifications */}
      {hasCritical && count > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6">
          <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-20" />
          <div className="absolute inset-1 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}