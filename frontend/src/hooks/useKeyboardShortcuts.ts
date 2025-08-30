import { useHotkeys } from 'react-hotkeys-hook'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from './useTheme'
import { useAppStore } from '../store'

interface KeyboardShortcut {
  key: string
  description: string
  category: string
  action: () => void
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate()
  const { toggleTheme } = useTheme()
  const { setActiveModal, toggleSidebar } = useAppStore()

  // Navegación
  const goToDashboard = useCallback(() => navigate('/'), [navigate])
  const goToWatchlist = useCallback(() => navigate('/watchlist'), [navigate])
  const goToOpportunities = useCallback(() => navigate('/opportunities'), [navigate])
  const goToPortfolio = useCallback(() => navigate('/portfolio'), [navigate])
  const goToTrades = useCallback(() => navigate('/trades'), [navigate])
  const goToGoals = useCallback(() => navigate('/goals'), [navigate])
  const goToSettings = useCallback(() => navigate('/settings'), [navigate])

  // UI Controls
  const showCommandPalette = useCallback(() => {
    setActiveModal('command-palette')
  }, [setActiveModal])

  const showShortcutsHelp = useCallback(() => {
    setActiveModal('keyboard-shortcuts')
  }, [setActiveModal])

  const closeModal = useCallback(() => {
    setActiveModal(null)
  }, [setActiveModal])

  // Definir shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navegación
    { key: 'ctrl+1', description: 'Ir al Dashboard', category: 'Navegación', action: goToDashboard },
    { key: 'ctrl+2', description: 'Ir a Watchlist', category: 'Navegación', action: goToWatchlist },
    { key: 'ctrl+3', description: 'Ir a Oportunidades', category: 'Navegación', action: goToOpportunities },
    { key: 'ctrl+4', description: 'Ir a Portfolio', category: 'Navegación', action: goToPortfolio },
    { key: 'ctrl+5', description: 'Ir a Trades', category: 'Navegación', action: goToTrades },
    { key: 'ctrl+6', description: 'Ir a Goals', category: 'Navegación', action: goToGoals },
    { key: 'ctrl+,', description: 'Ir a Configuración', category: 'Navegación', action: goToSettings },
    
    // UI Controls
    { key: 'ctrl+k', description: 'Abrir Command Palette', category: 'UI', action: showCommandPalette },
    { key: 'ctrl+/', description: 'Mostrar atajos de teclado', category: 'UI', action: showShortcutsHelp },
    { key: 'ctrl+b', description: 'Toggle Sidebar', category: 'UI', action: toggleSidebar },
    { key: 'alt+t', description: 'Cambiar tema', category: 'UI', action: toggleTheme },
    { key: 'escape', description: 'Cerrar modal', category: 'UI', action: closeModal },
  ]

  // Registrar shortcuts
  useHotkeys('ctrl+1', (e) => { e.preventDefault(); goToDashboard(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+2', (e) => { e.preventDefault(); goToWatchlist(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+3', (e) => { e.preventDefault(); goToOpportunities(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+4', (e) => { e.preventDefault(); goToPortfolio(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+5', (e) => { e.preventDefault(); goToTrades(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+6', (e) => { e.preventDefault(); goToGoals(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+,', (e) => { e.preventDefault(); goToSettings(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+k', (e) => { e.preventDefault(); showCommandPalette(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+/', (e) => { e.preventDefault(); showShortcutsHelp(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('ctrl+b', (e) => { e.preventDefault(); toggleSidebar(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('alt+t', (e) => { e.preventDefault(); toggleTheme(); }, { enableOnContentEditable: false, enableOnFormTags: false })
  useHotkeys('escape', (e) => { e.preventDefault(); closeModal(); }, { enableOnContentEditable: false, enableOnFormTags: false })

  return {
    shortcuts,
    showCommandPalette,
    showShortcutsHelp
  }
}

// Hook específico para formularios
export const useFormShortcuts = (onSave?: () => void, onCancel?: () => void) => {
  const saveAction = useCallback(() => {
    if (onSave) onSave()
  }, [onSave])

  const cancelAction = useCallback(() => {
    if (onCancel) onCancel()
  }, [onCancel])

  useHotkeys('ctrl+s', (e) => {
    e.preventDefault()
    saveAction()
  }, {
    enableOnFormTags: true,
  })

  useHotkeys('escape', (e) => {
    e.preventDefault()
    cancelAction()
  }, {
    enableOnFormTags: true,
  })

  return {
    saveAction,
    cancelAction
  }
}

// Hook para shortcuts de tabla/lista
export const useTableShortcuts = (
  items: any[] = [],
  selectedIndex: number = -1,
  onSelect: (index: number) => void,
  onAction?: (item: any) => void
) => {
  const selectNext = useCallback(() => {
    if (items.length === 0) return
    const nextIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0
    onSelect(nextIndex)
  }, [items.length, selectedIndex, onSelect])

  const selectPrevious = useCallback(() => {
    if (items.length === 0) return
    const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1
    onSelect(prevIndex)
  }, [items.length, selectedIndex, onSelect])

  const executeAction = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < items.length && onAction) {
      onAction(items[selectedIndex])
    }
  }, [selectedIndex, items, onAction])

  useHotkeys('down', selectNext)
  useHotkeys('up', selectPrevious)
  useHotkeys('enter', executeAction)

  return {
    selectNext,
    selectPrevious,
    executeAction
  }
}