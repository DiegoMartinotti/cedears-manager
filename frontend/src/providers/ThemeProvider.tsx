import { ReactNode } from 'react'
import { useTheme } from '../hooks/useTheme'

interface ThemeProviderProps {
  children: ReactNode
}

const ThemeInitializer = () => {
  useTheme() // This will initialize the theme on mount
  return null
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <>
      <ThemeInitializer />
      {children}
    </>
  )
}