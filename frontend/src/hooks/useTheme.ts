import { useEffect } from 'react'
import { useAppStore } from '../store'

export type Theme = 'light' | 'dark' | 'system'

export const useTheme = () => {
  const { ui, setTheme } = useAppStore()
  const currentTheme = ui.theme

  useEffect(() => {
    const root = document.documentElement
    const isDarkMode = 
      currentTheme === 'dark' ||
      (currentTheme === 'system' && 
       window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [currentTheme])

  useEffect(() => {
    if (currentTheme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      const root = document.documentElement
      if (mediaQuery.matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [currentTheme])

  const toggleTheme = () => {
    const nextTheme: Theme = 
      currentTheme === 'light' ? 'dark' :
      currentTheme === 'dark' ? 'system' : 'light'
    setTheme(nextTheme)
  }

  const setSpecificTheme = (theme: Theme) => {
    setTheme(theme)
  }

  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return currentTheme
  }

  return {
    theme: currentTheme,
    effectiveTheme: getEffectiveTheme(),
    setTheme: setSpecificTheme,
    toggleTheme
  }
}