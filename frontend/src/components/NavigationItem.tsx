import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../utils/cn'

interface NavigationItemProps {
  to: string
  icon: ReactNode
  label: string
  badge?: number
}

export default function NavigationItem({ to, icon, label, badge }: NavigationItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'text-muted-foreground'
      )}
    >
      <span className="w-5 h-5 flex-shrink-0">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge && badge > 0 && (
        <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}