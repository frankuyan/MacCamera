/// <reference types="react-scripts" />

interface Window {
  electronAPI: {
    getVideoDevices: () => Promise<any>;
    getAudioDevices: () => Promise<any>;
    startRecording: (options: any) => Promise<any>;
    stopRecording: () => Promise<any>;
    saveRecording: (data: any) => Promise<any>;
    convertToMp4: (data: any) => Promise<any>;
    getRecordingsDir: () => Promise<any>;
    openRecordingsFolder: () => Promise<any>;
  };
}
