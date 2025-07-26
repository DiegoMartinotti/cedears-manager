import axios, { AxiosError, AxiosResponse } from 'axios'
import { ApiResponse } from '@cedears-manager/shared/types'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Backend URL
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to all requests for cache-busting
    config.params = {
      ...config.params,
      _t: Date.now(),
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Return the data directly if it's a successful API response
    if (response.data.success) {
      return response
    }
    
    // If the API indicates an error, throw it
    const error = new Error(response.data.error?.message || 'API Error')
    return Promise.reject(error)
  },
  (error: AxiosError<ApiResponse>) => {
    // Handle network errors and HTTP error status codes
    if (error.response?.data?.error) {
      // Use API error message if available
      const apiError = new Error(error.response.data.error.message)
      return Promise.reject(apiError)
    }
    
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout. Please try again.'))
    }
    
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'))
    }
    
    // Handle different HTTP status codes
    switch (error.response.status) {
      case 400:
        return Promise.reject(new Error('Bad request. Please check your input.'))
      case 401:
        return Promise.reject(new Error('Unauthorized. Please login again.'))
      case 403:
        return Promise.reject(new Error('Forbidden. You do not have permission.'))
      case 404:
        return Promise.reject(new Error('Resource not found.'))
      case 429:
        return Promise.reject(new Error('Too many requests. Please wait and try again.'))
      case 500:
        return Promise.reject(new Error('Server error. Please try again later.'))
      case 503:
        return Promise.reject(new Error('Service unavailable. Please try again later.'))
      default:
        return Promise.reject(new Error(`Request failed with status ${error.response.status}`))
    }
  }
)

// API endpoints configuration
export const endpoints = {
  // Health check
  health: '/health',
  
  // CEDEARs
  cedears: {
    list: '/cedears',
    create: '/cedears',
    getById: (id: string) => `/cedears/${id}`,
    update: (id: string) => `/cedears/${id}`,
    delete: (id: string) => `/cedears/${id}`,
    search: '/cedears/search',
  },
  
  // Quotes
  quotes: {
    latest: '/quotes/latest',
    getBySymbol: (symbol: string) => `/quotes/${symbol}`,
    history: (symbol: string) => `/quotes/${symbol}/history`,
  },
  
  // Trades
  trades: {
    list: '/trades',
    create: '/trades',
    getById: (id: string) => `/trades/${id}`,
    update: (id: string) => `/trades/${id}`,
    delete: (id: string) => `/trades/${id}`,
  },
  
  // Goals
  goals: {
    list: '/goals',
    create: '/goals',
    getById: (id: string) => `/goals/${id}`,
    update: (id: string) => `/goals/${id}`,
    delete: (id: string) => `/goals/${id}`,
  },
  
  // Analysis
  analysis: {
    technical: (symbol: string) => `/analysis/technical/${symbol}`,
    claude: '/analysis/claude',
  },
  
  // Settings
  settings: {
    get: '/settings',
    update: '/settings',
  },
  
  // Commissions
  commissions: {
    list: '/commissions',
    create: '/commissions',
    getById: (id: string) => `/commissions/${id}`,
    update: (id: string) => `/commissions/${id}`,
    delete: (id: string) => `/commissions/${id}`,
  },
}

// Utility functions for common API patterns
export const apiUtils = {
  // Generic GET request
  get: async <T>(url: string, params?: Record<string, any>): Promise<T> => {
    const response = await api.get<ApiResponse<T>>(url, { params })
    return response.data.data as T
  },
  
  // Generic POST request
  post: async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.post<ApiResponse<T>>(url, data)
    return response.data.data as T
  },
  
  // Generic PUT request
  put: async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.put<ApiResponse<T>>(url, data)
    return response.data.data as T
  },
  
  // Generic DELETE request
  delete: async <T>(url: string): Promise<T> => {
    const response = await api.delete<ApiResponse<T>>(url)
    return response.data.data as T
  },
  
  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    return apiUtils.get(endpoints.health)
  },
  
  // Connection test
  testConnection: async (): Promise<boolean> => {
    try {
      await apiUtils.healthCheck()
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  },
}

export default api