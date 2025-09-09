import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { Button } from './Button'
import { cn } from '../../utils/cn'

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'icon'
  className?: string
}

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor
}

const themeLabels = {
  light: 'Modo claro',
  dark: 'Modo oscuro', 
  system: 'Sistema'
}

export const ThemeToggle = ({ variant = 'default', className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme()
  const Icon = themeIcons[theme]

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className={cn('h-9 w-9', className)}
        title={`Cambiar tema (actual: ${themeLabels[theme]})`}
      >
        <Icon className="h-4 w-4" />
        <span className="sr-only">Cambiar tema</span>
      </Button>
    )
  }

  if (variant === 'compact') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleTheme}
        className={cn('gap-2', className)}
        title={`Cambiar tema (actual: ${themeLabels[theme]})`}
      >
        <Icon className="h-4 w-4" />
        {themeLabels[theme]}
      </Button>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium text-muted-foreground">Tema:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleTheme}
        className="gap-2 min-w-[120px] justify-start"
        title="Clic para cambiar entre claro, oscuro y sistema"
      >
        <Icon className="h-4 w-4" />
        {themeLabels[theme]}
      </Button>
    </div>
  )
}

