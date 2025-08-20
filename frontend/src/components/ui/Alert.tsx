import React from 'react'
import { cn } from '../../utils/cn'

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  className?: string
  children: React.ReactNode
}

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'default', 
  className, 
  children 
}) => {
  const baseClasses = 'relative w-full rounded-lg border p-4'
  
  const variantClasses = {
    default: 'bg-background text-foreground',
    destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    success: 'border-green-500/50 text-green-700 bg-green-50 dark:border-green-500 dark:bg-green-950 dark:text-green-400',
    warning: 'border-yellow-500/50 text-yellow-700 bg-yellow-50 dark:border-yellow-500 dark:bg-yellow-950 dark:text-yellow-400'
  }

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  )
}

interface AlertDescriptionProps {
  className?: string
  children: React.ReactNode
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ 
  className, 
  children 
}) => {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)}>
      {children}
    </div>
  )
}