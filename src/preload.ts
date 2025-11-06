import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVideoDevices: () => ipcRenderer.invoke('get-video-devices'),
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
  startRecording: (options: any) => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  saveRecording: (data: any) => ipcRenderer.invoke('save-recording', data),
  getRecordingsDir: () => ipcRenderer.invoke('get-recordings-dir'),
  openRecordingsFolder: () => ipcRenderer.invoke('open-recordings-folder'),
});

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getVideoDevices: () => Promise<any>;
      getAudioDevices: () => Promise<any>;
      startRecording: (options: any) => Promise<any>;
      stopRecording: () => Promise<any>;
      saveRecording: (data: any) => Promise<any>;
      getRecordingsDir: () => Promise<any>;
      openRecordingsFolder: () => Promise<any>;
    };
  }
}
