// Shared types between main and renderer processes

export type RecordingMode = 'video' | 'photo';

export interface RecordingOptions {
  deviceId: string;
  audioDeviceId?: string;
  mode: RecordingMode;
  withAudio: boolean;
  resolution: string;
  fps: number;
}

export interface SaveRecordingData {
  buffer: ArrayBuffer;
  filename: string;
}

export interface ConvertToMp4Data {
  webmPath: string;
  mp4Filename: string;
  keepWebm?: boolean;
}

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface VideoDevice {
  id: string;
  name: string;
  displayId?: string;
}

export interface RecordingsDirectory {
  path: string;
}

export interface SavedRecording {
  path: string;
}

export interface ConvertedRecording {
  path: string;
}
