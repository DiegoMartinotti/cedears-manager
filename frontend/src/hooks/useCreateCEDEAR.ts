import { useState } from 'react'
import { CEDEAR } from '@cedears-manager/shared/types'
import { useAppStore } from '../store'

export function useCreateCEDEAR() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addNotification, addToWatchlist } = useAppStore()

  const createCEDEAR = async (cedearData: Omit<CEDEAR, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true)
      setError(null)
      
      // For now, create locally until backend is ready
      const newCEDEAR: CEDEAR = {
        ...cedearData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      addToWatchlist(newCEDEAR)
      
      addNotification({
        type: 'success',
        title: 'CEDEAR Agregado',
        message: `${cedearData.symbol} ha sido agregado a tu watchlist`,
        isRead: false,
      })

      return newCEDEAR
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create CEDEAR'
      setError(errorMessage)
      addNotification({
        type: 'error',
        title: 'Error al agregar CEDEAR',
        message: errorMessage,
        isRead: false,
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    createCEDEAR,
    loading,
    error,
  }
}