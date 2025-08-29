import { useInstrumentsCount } from './useInstruments'

const MAX_INSTRUMENTS = 100

// Hook for limit management
export const useInstrumentLimit = () => {
  const { data: totalCount = 0, isLoading } = useInstrumentsCount({ isActive: true })
  
  const remaining = Math.max(0, MAX_INSTRUMENTS - totalCount)
  const isAtLimit = totalCount >= MAX_INSTRUMENTS
  const isNearLimit = totalCount >= MAX_INSTRUMENTS * 0.9 // 90% of limit
  const progressPercentage = Math.min((totalCount / MAX_INSTRUMENTS) * 100, 100)
  
  return {
    totalCount,
    remaining,
    isAtLimit,
    isNearLimit,
    progressPercentage,
    maxInstruments: MAX_INSTRUMENTS,
    isLoading,
    canAddMore: !isAtLimit,
  }
}

// Hook to check if can add instruments before showing form
export const useCanAddInstrument = () => {
  const limit = useInstrumentLimit()
  return {
    canAdd: limit.canAddMore,
    ...limit,
  }
}