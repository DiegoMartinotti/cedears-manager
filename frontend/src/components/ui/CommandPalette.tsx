import React, { useState, useEffect } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Home, 
  Eye, 
  TrendingUp, 
  Briefcase, 
  DollarSign,
  Target,
  Settings,
  Moon,
  Sun,
  Monitor,
  Calculator,
  BarChart3,
  Bell,
  FileText,
  Users,
  Calendar,
  PieChart
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { useAppStore } from '../../store'
import { cn } from '../../utils/cn'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ElementType
  action: () => void
  category: string
  keywords?: string[]
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { setTheme, theme } = useTheme()

  const commands: CommandItem[] = [
    // Navegación
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Resumen general de la cartera',
      icon: Home,
      action: () => navigate('/'),
      category: 'Navegación',
      keywords: ['inicio', 'home', 'resumen']
    },
    {
      id: 'nav-watchlist',
      title: 'Watchlist',
      subtitle: 'Instrumentos seguidos',
      icon: Eye,
      action: () => navigate('/watchlist'),
      category: 'Navegación',
      keywords: ['seguir', 'instrumentos', 'watch']
    },
    {
      id: 'nav-opportunities',
      title: 'Oportunidades',
      subtitle: 'Análisis de compra',
      icon: TrendingUp,
      action: () => navigate('/opportunities'),
      category: 'Navegación',
      keywords: ['comprar', 'análisis', 'oportunidad']
    },
    {
      id: 'nav-portfolio',
      title: 'Portfolio',
      subtitle: 'Posiciones actuales',
      icon: Briefcase,
      action: () => navigate('/portfolio'),
      category: 'Navegación',
      keywords: ['cartera', 'posiciones', 'holdings']
    },
    {
      id: 'nav-trades',
      title: 'Operaciones',
      subtitle: 'Historial de trades',
      icon: DollarSign,
      action: () => navigate('/trades'),
      category: 'Navegación',
      keywords: ['trades', 'compras', 'ventas', 'historial']
    },
    {
      id: 'nav-goals',
      title: 'Objetivos',
      subtitle: 'Metas financieras',
      icon: Target,
      action: () => navigate('/goals'),
      category: 'Navegación',
      keywords: ['metas', 'objetivos', 'goals', 'targets']
    },
    {
      id: 'nav-break-even',
      title: 'Break-Even',
      subtitle: 'Análisis de punto de equilibrio',
      icon: Calculator,
      action: () => navigate('/break-even'),
      category: 'Navegación',
      keywords: ['equilibrio', 'break', 'even', 'cálculos']
    },
    {
      id: 'nav-sector-balance',
      title: 'Balance Sectorial',
      subtitle: 'Diversificación por sectores',
      icon: PieChart,
      action: () => navigate('/sector-balance'),
      category: 'Navegación',
      keywords: ['sectores', 'diversificación', 'balance']
    },
    {
      id: 'nav-notifications',
      title: 'Notificaciones',
      subtitle: 'Centro de notificaciones',
      icon: Bell,
      action: () => navigate('/notifications'),
      category: 'Navegación',
      keywords: ['alertas', 'notificaciones', 'avisos']
    },
    {
      id: 'nav-settings',
      title: 'Configuración',
      subtitle: 'Ajustes de la aplicación',
      icon: Settings,
      action: () => navigate('/settings'),
      category: 'Navegación',
      keywords: ['config', 'ajustes', 'settings', 'preferencias']
    },

    // Tema
    {
      id: 'theme-light',
      title: 'Tema Claro',
      subtitle: 'Cambiar al tema claro',
      icon: Sun,
      action: () => setTheme('light'),
      category: 'Tema',
      keywords: ['claro', 'light', 'blanco']
    },
    {
      id: 'theme-dark',
      title: 'Tema Oscuro',
      subtitle: 'Cambiar al tema oscuro',
      icon: Moon,
      action: () => setTheme('dark'),
      category: 'Tema',
      keywords: ['oscuro', 'dark', 'negro']
    },
    {
      id: 'theme-system',
      title: 'Tema del Sistema',
      subtitle: 'Seguir preferencia del sistema',
      icon: Monitor,
      action: () => setTheme('system'),
      category: 'Tema',
      keywords: ['sistema', 'system', 'auto']
    }
  ]

  const filteredCommands = commands.filter(command => {
    if (!search) return true
    
    const searchLower = search.toLowerCase()
    const titleMatch = command.title.toLowerCase().includes(searchLower)
    const subtitleMatch = command.subtitle?.toLowerCase().includes(searchLower)
    const keywordsMatch = command.keywords?.some(keyword => 
      keyword.toLowerCase().includes(searchLower)
    )
    
    return titleMatch || subtitleMatch || keywordsMatch
  })

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = []
    }
    acc[command.category].push(command)
    return acc
  }, {} as Record<string, CommandItem[]>)

  const handleSelect = (command: CommandItem) => {
    command.action()
    onClose()
    setSearch('')
  }

  useEffect(() => {
    if (isOpen) {
      setSearch('')
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl mx-4"
          >
            <Command className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center border-b border-border px-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  placeholder="Buscar comandos..."
                  value={search}
                  onValueChange={setSearch}
                  className="flex-1 bg-transparent border-0 py-4 px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                />
              </div>

              <Command.List className="max-h-96 overflow-y-auto p-2">
                <Command.Empty className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No se encontraron comandos</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Intenta con otros términos de búsqueda
                  </p>
                </Command.Empty>

                {Object.entries(groupedCommands).map(([category, items]) => (
                  <Command.Group key={category} heading={category} className="mb-2">
                    {items.map((command) => (
                      <Command.Item
                        key={command.id}
                        value={command.id}
                        onSelect={() => handleSelect(command)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                        )}
                      >
                        <command.icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">
                            {command.title}
                          </div>
                          {command.subtitle && (
                            <div className="text-sm text-muted-foreground truncate">
                              {command.subtitle}
                            </div>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">↑↓</kbd>
                    Navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">Enter</kbd>
                    Seleccionar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">Esc</kbd>
                    Cerrar
                  </span>
                </div>
                <span>Ctrl+K para abrir</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}