import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InstrumentService, instrumentQueryKeys } from '../services/instrumentService'
import { InstrumentUI, InstrumentFilters } from '@cedears-manager/shared/types'
import { useCallback, useMemo } from 'react'

/**
 * Hook for managing instruments list with filters and caching
 */
export const useInstruments = (filters?: InstrumentFilters) => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: instrumentQueryKeys.list(filters),
    queryFn: () => InstrumentService.getAllInstruments(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    enabled: true,
  })

  // Invalidate cache when needed
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.lists() })
  }, [queryClient])

  // Prefetch next page or related data
  const prefetchInstruments = useCallback((prefetchFilters?: InstrumentFilters) => {
    queryClient.prefetchQuery({
      queryKey: instrumentQueryKeys.list(prefetchFilters),
      queryFn: () => InstrumentService.getAllInstruments(prefetchFilters),
      staleTime: 1000 * 60 * 5,
    })
  }, [queryClient])

  return {
    ...query,
    instruments: query.data || [],
    invalidateCache,
    prefetchInstruments,
  }
}

/**
 * Hook for getting a single instrument by ID
 */
export const useInstrument = (id: number | null) => {
  return useQuery({
    queryKey: instrumentQueryKeys.detail(id!),
    queryFn: () => InstrumentService.getInstrumentById(id!),
    enabled: id !== null && id > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })
}

/**
 * Hook for searching instruments with debounce functionality
 */
export const useInstrumentSearch = (searchTerm: string, enabled: boolean = true) => {
  const debouncedSearchTerm = useMemo(() => {
    // Simple debounce effect - only search if term is meaningful
    if (!searchTerm || searchTerm.length < 2) return ''
    return searchTerm.trim()
  }, [searchTerm])

  return useQuery({
    queryKey: instrumentQueryKeys.search(debouncedSearchTerm),
    queryFn: () => InstrumentService.searchInstruments(debouncedSearchTerm),
    enabled: enabled && debouncedSearchTerm.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutes for search results
    gcTime: 1000 * 60 * 5,
    retry: 2,
  })
}

/**
 * Hook for ESG instruments
 */
export const useESGInstruments = () => {
  return useQuery({
    queryKey: instrumentQueryKeys.esg(),
    queryFn: InstrumentService.getESGInstruments,
    staleTime: 1000 * 60 * 10, // 10 minutes - ESG status changes less frequently
    gcTime: 1000 * 60 * 15,
  })
}

/**
 * Hook for vegan instruments
 */
export const useVeganInstruments = () => {
  return useQuery({
    queryKey: instrumentQueryKeys.vegan(),
    queryFn: InstrumentService.getVeganInstruments,
    staleTime: 1000 * 60 * 10, // 10 minutes - Vegan status changes less frequently
    gcTime: 1000 * 60 * 15,
  })
}

/**
 * Hook for available sectors
 */
export const useInstrumentSectors = () => {
  return useQuery({
    queryKey: instrumentQueryKeys.sectors(),
    queryFn: InstrumentService.getAvailableSectors,
    staleTime: 1000 * 60 * 15, // 15 minutes - sectors change infrequently
    gcTime: 1000 * 60 * 30,
  })
}

/**
 * Hook for instruments count
 */
export const useInstrumentsCount = (filters?: InstrumentFilters) => {
  return useQuery({
    queryKey: instrumentQueryKeys.count(filters),
    queryFn: () => InstrumentService.getInstrumentsCount(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })
}

/**
 * Hook for creating instruments
 */
export const useCreateInstrument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (instrumentData: Omit<InstrumentUI, 'id' | 'createdAt' | 'updatedAt'>) =>
      InstrumentService.createInstrument(instrumentData),
    onSuccess: (newInstrument) => {
      // Update all relevant caches
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.sectors() })
      
      // Add the new instrument to existing caches
      queryClient.setQueryData(
        instrumentQueryKeys.detail(newInstrument.id),
        newInstrument
      )
    },
    onError: (error) => {
      console.error('Failed to create instrument:', error)
    },
  })
}

/**
 * Hook for updating instruments
 */
export const useUpdateInstrument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InstrumentUI> }) =>
      InstrumentService.updateInstrument(id, data),
    onSuccess: (updatedInstrument) => {
      // Update specific instrument cache
      queryClient.setQueryData(
        instrumentQueryKeys.detail(updatedInstrument.id),
        updatedInstrument
      )
      
      // Update lists that might contain this instrument
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.lists() })
      
      // Update sectors if sector changed
      if ('sector' in updatedInstrument) {
        queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.sectors() })
      }
    },
    onError: (error) => {
      console.error('Failed to update instrument:', error)
    },
  })
}

/**
 * Hook for deleting instruments
 */
export const useDeleteInstrument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => InstrumentService.deleteInstrument(id),
    onSuccess: (_, deletedId) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: instrumentQueryKeys.detail(deletedId) })
      
      // Update all lists
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.sectors() })
    },
    onError: (error) => {
      console.error('Failed to delete instrument:', error)
    },
  })
}

/**
 * Hook for toggling ESG compliance
 */
export const useToggleESGCompliance = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => InstrumentService.toggleESGCompliance(id),
    onSuccess: (updatedInstrument) => {
      // Update specific instrument
      queryClient.setQueryData(
        instrumentQueryKeys.detail(updatedInstrument.id),
        updatedInstrument
      )
      
      // Update lists and ESG cache
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.esg() })
    },
  })
}

/**
 * Hook for toggling vegan-friendly status
 */
export const useToggleVeganFriendly = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => InstrumentService.toggleVeganFriendly(id),
    onSuccess: (updatedInstrument) => {
      // Update specific instrument
      queryClient.setQueryData(
        instrumentQueryKeys.detail(updatedInstrument.id),
        updatedInstrument
      )
      
      // Update lists and vegan cache
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.vegan() })
    },
  })
}

/**
 * Hook for bulk operations
 */
export const useBulkCreateInstruments = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (instrumentsData: Omit<InstrumentUI, 'id' | 'createdAt' | 'updatedAt'>[]) =>
      InstrumentService.bulkCreateInstruments(instrumentsData),
    onSuccess: () => {
      // Invalidate all caches after bulk operation
      queryClient.invalidateQueries({ queryKey: instrumentQueryKeys.all })
    },
  })
}

/**
 * Combined hook for instruments management with common operations
 */
export const useInstrumentsManager = (filters?: InstrumentFilters) => {
  const instrumentsQuery = useInstruments(filters)
  const createMutation = useCreateInstrument()
  const updateMutation = useUpdateInstrument()
  const deleteMutation = useDeleteInstrument()
  const toggleESGMutation = useToggleESGCompliance()
  const toggleVeganMutation = useToggleVeganFriendly()
  const bulkCreateMutation = useBulkCreateInstruments()

  const isLoading = instrumentsQuery.isLoading || 
                   createMutation.isPending || 
                   updateMutation.isPending || 
                   deleteMutation.isPending ||
                   toggleESGMutation.isPending ||
                   toggleVeganMutation.isPending ||
                   bulkCreateMutation.isPending

  const hasError = instrumentsQuery.error || 
                  createMutation.error || 
                  updateMutation.error || 
                  deleteMutation.error ||
                  toggleESGMutation.error ||
                  toggleVeganMutation.error ||
                  bulkCreateMutation.error

  return {
    // Data
    instruments: instrumentsQuery.instruments,
    isLoading,
    hasError,
    error: hasError,
    
    // Query info
    isFetching: instrumentsQuery.isFetching,
    isSuccess: instrumentsQuery.isSuccess,
    
    // Operations
    createInstrument: createMutation.mutate,
    updateInstrument: updateMutation.mutate,
    deleteInstrument: deleteMutation.mutate,
    toggleESGCompliance: toggleESGMutation.mutate,
    toggleVeganFriendly: toggleVeganMutation.mutate,
    bulkCreateInstruments: bulkCreateMutation.mutate,
    
    // Cache management
    refetch: instrumentsQuery.refetch,
    invalidateCache: instrumentsQuery.invalidateCache,
    prefetchInstruments: instrumentsQuery.prefetchInstruments,
  }
}

/**
 * Hook for real-time instruments monitoring
 */
export const useInstrumentsMonitor = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['instruments', 'monitor'],
    queryFn: async () => {
      // Get basic count and status
      const count = await InstrumentService.getInstrumentsCount({ isActive: true })
      const esgCount = await InstrumentService.getInstrumentsCount({ isActive: true, isESG: true })
      const veganCount = await InstrumentService.getInstrumentsCount({ isActive: true, isVegan: true })
      
      return {
        totalActive: count,
        esgCompliant: esgCount,
        veganFriendly: veganCount,
        lastUpdated: new Date(),
      }
    },
    enabled,
    refetchInterval: 1000 * 60 * 5, // Every 5 minutes
    staleTime: 1000 * 60 * 2,
  })
}