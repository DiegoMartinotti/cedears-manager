import { contextBridge, ipcRenderer } from 'electron';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),
    // Store management
    store: {
        get: (key) => ipcRenderer.invoke('store-get', key),
        set: (key, value) => ipcRenderer.invoke('store-set', key, value)
    },
    // Navigation
    onNavigate: (callback) => {
        ipcRenderer.on('navigate', (_, route) => callback(route));
    },
    // Updates
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    // Remove all listeners (cleanup)
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
//# sourceMappingURL=preload.js.map