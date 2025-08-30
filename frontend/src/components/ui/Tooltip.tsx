import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../utils/cn'

const TooltipProvider = TooltipPrimitive.Provider

const TooltipRoot = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Simple tooltip wrapper component
interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  className?: string
  contentClassName?: string
}

const Tooltip = ({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 400,
  className,
  contentClassName
}: TooltipProps) => (
  <TooltipProvider delayDuration={delayDuration}>
    <TooltipRoot>
      <TooltipTrigger asChild className={className}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className={contentClassName}>
        {content}
      </TooltipContent>
    </TooltipRoot>
  </TooltipProvider>
)

// InfoTooltip - for help/info icons
interface InfoTooltipProps {
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

import { HelpCircle } from 'lucide-react'

const InfoTooltip = ({ content, side = 'top', className }: InfoTooltipProps) => (
  <Tooltip
    content={content}
    side={side}
    contentClassName="max-w-xs"
  >
    <button
      className={cn(
        'inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
      type="button"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  </Tooltip>
)

// KeyboardTooltip - shows keyboard shortcuts
interface KeyboardTooltipProps {
  children: React.ReactNode
  shortcut: string
  description: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const KeyboardTooltip = ({ children, shortcut, description, side = 'bottom' }: KeyboardTooltipProps) => (
  <Tooltip
    content={
      <div className="space-y-1">
        <div className="font-medium">{description}</div>
        <div className="text-xs opacity-75">
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted text-muted-foreground rounded border">
            {shortcut}
          </kbd>
        </div>
      </div>
    }
    side={side}
  >
    {children}
  </Tooltip>
)

// MetricTooltip - for financial metrics with context
interface MetricTooltipProps {
  children: React.ReactNode
  title: string
  description: string
  value?: string | number
  formula?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const MetricTooltip = ({ 
  children, 
  title, 
  description, 
  value, 
  formula,
  side = 'top' 
}: MetricTooltipProps) => (
  <Tooltip
    content={
      <div className="space-y-2 max-w-sm">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-sm">{description}</div>
        {value && (
          <div className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
            Valor actual: {value}
          </div>
        )}
        {formula && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Fórmula: <code className="font-mono">{formula}</code>
          </div>
        )}
      </div>
    }
    side={side}
    contentClassName="max-w-sm"
  >
    {children}
  </Tooltip>
)

export {
  Tooltip,
  InfoTooltip,
  KeyboardTooltip,
  MetricTooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
}