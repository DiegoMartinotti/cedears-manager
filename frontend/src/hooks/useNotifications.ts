import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { notificationService } from '../services/notificationService'
import { NotificationData, NotificationFilters } from '../types/notification'

// Query keys
export const NOTIFICATION_QUERY_KEYS = {
  all: ['notifications'] as const,
  lists: () => [...NOTIFICATION_QUERY_KEYS.all, 'list'] as const,
  list: (filters: NotificationFilters, page: number, pageSize: number, search?: string) => 
    [...NOTIFICATION_QUERY_KEYS.lists(), { filters, page, pageSize, search }] as const,
  summary: () => [...NOTIFICATION_QUERY_KEYS.all, 'summary'] as const,
  stats: () => [...NOTIFICATION_QUERY_KEYS.all, 'stats'] as const,
  unreadCount: () => [...NOTIFICATION_QUERY_KEYS.all, 'unreadCount'] as const,
  detail: (id: number) => [...NOTIFICATION_QUERY_KEYS.all, 'detail', id] as const
}

/**
 * Hook to get notifications with filtering and pagination
 */
export function useNotifications(
  filters: NotificationFilters = {},
  page = 1,
  pageSize = 20,
  search?: string
) {
  const queryResult = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list(filters, page, pageSize, search),
    queryFn: () => notificationService.getNotifications(filters, page, pageSize, search),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    ...queryResult,
    notifications: queryResult.data?.notifications || [],
    total: queryResult.data?.total || 0,
    hasMore: queryResult.data?.hasMore || false
  }
}

/**
 * Hook to get notification summary
 */
export function useNotificationSummary() {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.summary(),
    queryFn: () => notificationService.getSummary(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Hook to get notification statistics
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.stats(),
    queryFn: () => notificationService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to get unread count (for badge)
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount(),
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

/**
 * Hook to get notification by ID
 */
export function useNotification(id: number) {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.detail(id),
    queryFn: () => notificationService.getNotificationById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for notification mutations
 */
export function useNotificationMutations() {
  const queryClient = useQueryClient()

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      // Invalidate all notification-related queries
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all })
    },
  })

  const markMultipleAsReadMutation = useMutation({
    mutationFn: (ids: number[]) => notificationService.markMultipleAsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: (filters?: NotificationFilters) => notificationService.markAllAsRead(filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => notificationService.archiveNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all })
    },
  })

  return {
    markAsRead: markAsReadMutation,
    markMultipleAsRead: markMultipleAsReadMutation,
    markAllAsRead: markAllAsReadMutation,
    archive: archiveMutation,
    delete: deleteMutation,
  }
}

/**
 * Hook to handle notification actions
 */
export function useNotificationActions() {
  const mutations = useNotificationMutations()
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const handleMarkAsRead = async (id: number) => {
    await mutations.markAsRead.mutateAsync(id)
  }

  const handleMarkMultipleAsRead = async (ids: number[]) => {
    await mutations.markMultipleAsRead.mutateAsync(ids)
    setSelectedIds([])
  }

  const handleMarkAllAsRead = async (filters?: NotificationFilters) => {
    await mutations.markAllAsRead.mutateAsync(filters)
    setSelectedIds([])
  }

  const handleArchive = async (id: number) => {
    await mutations.archive.mutateAsync(id)
  }

  const handleDelete = async (id: number) => {
    await mutations.delete.mutateAsync(id)
  }

  const handleSelectionChange = (id: number, selected: boolean) => {
    setSelectedIds(prev => 
      selected ? [...prev, id] : prev.filter(existingId => existingId !== id)
    )
  }

  const handleSelectAll = (notifications: NotificationData[]) => {
    setSelectedIds(notifications.map(n => n.id))
  }

  const handleDeselectAll = () => {
    setSelectedIds([])
  }

  return {
    selectedIds,
    markAsRead: handleMarkAsRead,
    markMultipleAsRead: handleMarkMultipleAsRead,
    markAllAsRead: handleMarkAllAsRead,
    archive: handleArchive,
    delete: handleDelete,
    onSelectionChange: handleSelectionChange,
    selectAll: handleSelectAll,
    deselectAll: handleDeselectAll,
    isLoading: mutations.markAsRead.isPending || 
              mutations.markMultipleAsRead.isPending || 
              mutations.markAllAsRead.isPending || 
              mutations.archive.isPending || 
              mutations.delete.isPending
  }
}

/**
 * Hook for search functionality
 */
export function useNotificationSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchResults = useQuery({
    queryKey: ['notifications', 'search', debouncedQuery],
    queryFn: () => notificationService.searchNotifications(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  return {
    searchQuery,
    setSearchQuery,
    searchResults: searchResults.data || [],
    isSearching: searchResults.isFetching,
    hasSearchResults: debouncedQuery.length > 0 && (searchResults.data?.length || 0) > 0
  }
}

/**
 * Hook for notification filters
 */
export function useNotificationFilters() {
  const [filters, setFilters] = useState<NotificationFilters>({})

  const updateFilter = <K extends keyof NotificationFilters>(
    key: K, 
    value: NotificationFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const clearFilter = <K extends keyof NotificationFilters>(key: K) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    clearFilter,
    hasFilters: Object.keys(filters).length > 0
  }
}

// Re-export React for useEffect
import React from 'react'