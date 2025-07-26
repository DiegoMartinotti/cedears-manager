import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Store management
  store: {
    get: (key: string) => ipcRenderer.invoke('store-get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value)
  },
  
  // Navigation
  onNavigate: (callback: (route: string) => void) => {
    ipcRenderer.on('navigate', (_, route) => callback(route))
  },
  
  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Remove all listeners (cleanup)
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// Type definitions for the exposed API
export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  store: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
  }
  onNavigate: (callback: (route: string) => void) => void
  checkForUpdates: () => Promise<{ available: boolean }>
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}