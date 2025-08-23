import apiClient from './apiClient'
import { 
  NotificationData, 
  NotificationFilters, 
  NotificationsResponse, 
  NotificationStatsResponse,
  NotificationSummaryResponse,
  UnreadCountResponse,
  CreateNotificationData
} from '../types/notification'

export class NotificationService {
  private readonly baseUrl = '/notifications'

  /**
   * Get notifications with filtering and pagination
   */
  async getNotifications(
    filters: NotificationFilters = {}, 
    page = 1, 
    pageSize = 20,
    search?: string
  ): Promise<NotificationsResponse['data']> {
    const params = new URLSearchParams()
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value))
      }
    })
    
    // Add pagination
    params.append('page', String(page))
    params.append('pageSize', String(pageSize))
    
    // Add search
    if (search) {
      params.append('search', search)
    }

    const response = await apiClient.get<NotificationsResponse>(
      `${this.baseUrl}?${params.toString()}`
    )
    return response.data.data
  }

  /**
   * Get notification summary for dashboard
   */
  async getSummary(): Promise<NotificationSummaryResponse['data']> {
    const response = await apiClient.get<NotificationSummaryResponse>(
      `${this.baseUrl}/summary`
    )
    return response.data.data
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<NotificationStatsResponse['data']> {
    const response = await apiClient.get<NotificationStatsResponse>(
      `${this.baseUrl}/stats`
    )
    return response.data.data
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>(
      `${this.baseUrl}/unread-count`
    )
    return response.data.data.count
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: number): Promise<NotificationData> {
    const response = await apiClient.get<{ success: boolean, data: NotificationData }>(
      `${this.baseUrl}/${id}`
    )
    return response.data.data
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: number): Promise<boolean> {
    const response = await apiClient.put<{ success: boolean, data: { updated: boolean } }>(
      `${this.baseUrl}/${id}/read`
    )
    return response.data.data.updated
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: number[]): Promise<number> {
    const response = await apiClient.put<{ success: boolean, data: { updated: number } }>(
      `${this.baseUrl}/mark-read`,
      { ids }
    )
    return response.data.data.updated
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(filters?: NotificationFilters): Promise<number> {
    const response = await apiClient.put<{ success: boolean, data: { updated: number } }>(
      `${this.baseUrl}/mark-read`,
      { filters }
    )
    return response.data.data.updated
  }

  /**
   * Archive notification
   */
  async archiveNotification(id: number): Promise<boolean> {
    const response = await apiClient.put<{ success: boolean, data: { archived: boolean } }>(
      `${this.baseUrl}/${id}/archive`
    )
    return response.data.data.archived
  }

  /**
   * Delete notification permanently
   */
  async deleteNotification(id: number): Promise<boolean> {
    const response = await apiClient.delete<{ success: boolean, data: { deleted: boolean } }>(
      `${this.baseUrl}/${id}`
    )
    return response.data.data.deleted
  }

  /**
   * Search notifications
   */
  async searchNotifications(query: string, limit = 50): Promise<NotificationData[]> {
    const response = await apiClient.get<{ 
      success: boolean, 
      data: { notifications: NotificationData[], query: string, total: number } 
    }>(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`)
    return response.data.data.notifications
  }

  /**
   * Create notification
   */
  async createNotification(data: CreateNotificationData): Promise<NotificationData> {
    const response = await apiClient.post<{ success: boolean, data: NotificationData }>(
      this.baseUrl,
      data
    )
    return response.data.data
  }

  /**
   * Create opportunity notification
   */
  async createOpportunityNotification(
    instrumentSymbol: string,
    score: number,
    reasons: string[]
  ): Promise<NotificationData> {
    const response = await apiClient.post<{ success: boolean, data: NotificationData }>(
      `${this.baseUrl}/opportunity`,
      { instrumentSymbol, score, reasons }
    )
    return response.data.data
  }

  /**
   * Create sell alert notification
   */
  async createSellAlertNotification(
    instrumentSymbol: string,
    currentPrice: number,
    targetPrice: number,
    gainPercentage: number
  ): Promise<NotificationData> {
    const response = await apiClient.post<{ success: boolean, data: NotificationData }>(
      `${this.baseUrl}/sell-alert`,
      { instrumentSymbol, currentPrice, targetPrice, gainPercentage }
    )
    return response.data.data
  }

  /**
   * Health check for notification system
   */
  async healthCheck(): Promise<{ status: string, stats: any, issues?: string[] }> {
    const response = await apiClient.get<{ 
      success: boolean, 
      data: { status: string, stats: any, issues?: string[] } 
    }>(`${this.baseUrl}/health`)
    return response.data.data
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
export default notificationService