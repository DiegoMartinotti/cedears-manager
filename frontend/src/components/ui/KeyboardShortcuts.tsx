import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

interface KeyboardShortcut {
  key: string
  description: string
  category: string
}

interface KeyboardShortcutsProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts: KeyboardShortcut[] = [
  // Navegación
  { key: 'Ctrl+1', description: 'Ir al Dashboard', category: 'Navegación' },
  { key: 'Ctrl+2', description: 'Ir a Watchlist', category: 'Navegación' },
  { key: 'Ctrl+3', description: 'Ir a Oportunidades', category: 'Navegación' },
  { key: 'Ctrl+4', description: 'Ir a Portfolio', category: 'Navegación' },
  { key: 'Ctrl+5', description: 'Ir a Trades', category: 'Navegación' },
  { key: 'Ctrl+6', description: 'Ir a Objetivos', category: 'Navegación' },
  { key: 'Ctrl+,', description: 'Ir a Configuración', category: 'Navegación' },
  
  // UI Controls
  { key: 'Ctrl+K', description: 'Abrir Command Palette', category: 'Interfaz' },
  { key: 'Ctrl+/', description: 'Mostrar atajos de teclado', category: 'Interfaz' },
  { key: 'Ctrl+B', description: 'Toggle Sidebar', category: 'Interfaz' },
  { key: 'Alt+T', description: 'Cambiar tema', category: 'Interfaz' },
  { key: 'Esc', description: 'Cerrar modal/overlay', category: 'Interfaz' },
  
  // Formularios
  { key: 'Ctrl+S', description: 'Guardar formulario', category: 'Formularios' },
  { key: 'Esc', description: 'Cancelar/cerrar formulario', category: 'Formularios' },
  
  // Listas y Tablas
  { key: '↑', description: 'Seleccionar elemento anterior', category: 'Navegación en Listas' },
  { key: '↓', description: 'Seleccionar elemento siguiente', category: 'Navegación en Listas' },
  { key: 'Enter', description: 'Ejecutar acción en elemento seleccionado', category: 'Navegación en Listas' },
]

const KbdKey: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-mono border border-border">
    {children}
  </kbd>
)

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  // Close on Escape
  React.useEffect(() => {
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
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden"
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <Keyboard className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Atajos de Teclado
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Navega más rápido con estos atajos de teclado
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-96">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      <h3 className="font-semibold text-foreground text-lg border-b border-border pb-2">
                        {category}
                      </h3>
                      <div className="space-y-3">
                        {shortcuts.map((shortcut, index) => (
                          <motion.div
                            key={shortcut.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                              duration: 0.2, 
                              delay: index * 0.05 
                            }}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <span className="text-foreground text-sm">
                              {shortcut.description}
                            </span>
                            <div className="flex gap-1">
                              {shortcut.key.split('+').map((key, i, arr) => (
                                <React.Fragment key={i}>
                                  <KbdKey>{key}</KbdKey>
                                  {i < arr.length - 1 && (
                                    <span className="text-muted-foreground text-xs mx-1">+</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <div className="border-t border-border px-6 py-4 bg-muted/20">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Presiona <KbdKey>Ctrl+/</KbdKey> para abrir esta ventana</span>
                  </div>
                  <span>Presiona <KbdKey>Esc</KbdKey> para cerrar</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Mini componente para mostrar un shortcut inline
export const InlineShortcut: React.FC<{
  keys: string
  className?: string
}> = ({ keys, className }) => (
  <div className={cn("flex items-center gap-1", className)}>
    {keys.split('+').map((key, i, arr) => (
      <React.Fragment key={i}>
        <KbdKey>{key}</KbdKey>
        {i < arr.length - 1 && (
          <span className="text-muted-foreground text-xs">+</span>
        )}
      </React.Fragment>
    ))}
  </div>
)

// Tooltip que muestra un shortcut
export const ShortcutTooltip: React.FC<{
  children: React.ReactNode
  shortcut: string
  description: string
}> = ({ children, shortcut, description }) => {
  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <div className="font-medium">{description}</div>
        <div className="flex items-center gap-1 mt-1">
          <InlineShortcut keys={shortcut} className="text-xs" />
        </div>
      </div>
    </div>
  )
}