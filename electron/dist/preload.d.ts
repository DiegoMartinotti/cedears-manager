export interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
    };
    onNavigate: (callback: (route: string) => void) => void;
    checkForUpdates: () => Promise<{
        available: boolean;
    }>;
    removeAllListeners: (channel: string) => void;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
