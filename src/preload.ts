import { contextBridge, ipcRenderer } from 'electron';
import {
  RecordingOptions,
  SaveRecordingData,
  ConvertToMp4Data,
  IPCResponse,
  RecordingsDirectory,
  SavedRecording,
  ConvertedRecording
} from './types/shared';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVideoDevices: (): Promise<IPCResponse> =>
    ipcRenderer.invoke('get-video-devices'),

  getAudioDevices: (): Promise<IPCResponse> =>
    ipcRenderer.invoke('get-audio-devices'),

  startRecording: (options: RecordingOptions): Promise<IPCResponse> =>
    ipcRenderer.invoke('start-recording', options),

  stopRecording: (): Promise<IPCResponse> =>
    ipcRenderer.invoke('stop-recording'),

  saveRecording: (data: SaveRecordingData): Promise<IPCResponse<SavedRecording>> =>
    ipcRenderer.invoke('save-recording', data),

  convertToMp4: (data: ConvertToMp4Data): Promise<IPCResponse<ConvertedRecording>> =>
    ipcRenderer.invoke('convert-to-mp4', data),

  getRecordingsDir: (): Promise<IPCResponse<RecordingsDirectory>> =>
    ipcRenderer.invoke('get-recordings-dir'),

  openRecordingsFolder: (): Promise<IPCResponse> =>
    ipcRenderer.invoke('open-recordings-folder'),
});

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getVideoDevices: () => Promise<IPCResponse>;
      getAudioDevices: () => Promise<IPCResponse>;
      startRecording: (options: RecordingOptions) => Promise<IPCResponse>;
      stopRecording: () => Promise<IPCResponse>;
      saveRecording: (data: SaveRecordingData) => Promise<IPCResponse<SavedRecording>>;
      convertToMp4: (data: ConvertToMp4Data) => Promise<IPCResponse<ConvertedRecording>>;
      getRecordingsDir: () => Promise<IPCResponse<RecordingsDirectory>>;
      openRecordingsFolder: () => Promise<IPCResponse>;
    };
  }
}
