// Recording constants
export const VIDEO_BITRATE = 10_000_000; // 10 Mbps for high quality
export const RECORDING_TIME_SLICE = 100; // Collect data every 100ms
export const JPEG_QUALITY = 1.0; // Maximum quality for photos

// Resolution options
export const RESOLUTIONS = [
  { value: '640x480', label: '640x480 (VGA)' },
  { value: '1280x720', label: '1280x720 (HD)' },
  { value: '1920x1080', label: '1920x1080 (Full HD)' },
  { value: '2560x1440', label: '2560x1440 (QHD)' },
  { value: '3840x2160', label: '3840x2160 (4K)' },
] as const;

// Frame rate options
export const FRAME_RATES = [
  { value: 24, label: '24 fps' },
  { value: 30, label: '30 fps' },
  { value: 60, label: '60 fps' },
] as const;

// Codec preferences (in order of preference)
export const CODEC_PREFERENCES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const;

// Local storage keys
export const STORAGE_KEYS = {
  RESOLUTION: 'maccamera_resolution',
  FPS: 'maccamera_fps',
  WITH_AUDIO: 'maccamera_with_audio',
  CONVERT_TO_MP4: 'maccamera_convert_to_mp4',
  SELECTED_VIDEO_DEVICE: 'maccamera_video_device',
  SELECTED_AUDIO_DEVICE: 'maccamera_audio_device',
} as const;
