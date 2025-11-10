import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';
import { RecordingMode } from '../types/shared';

export function useSettings() {
  const [resolution, setResolution] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.RESOLUTION) || '1920x1080';
  });

  const [fps, setFps] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FPS);
    return saved ? parseInt(saved, 10) : 30;
  });

  const [withAudio, setWithAudio] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WITH_AUDIO);
    return saved !== null ? saved === 'true' : true;
  });

  const [convertToMp4, setConvertToMp4] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONVERT_TO_MP4);
    return saved !== null ? saved === 'true' : true;
  });

  const [recordingMode, setRecordingMode] = useState<RecordingMode>('video');

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RESOLUTION, resolution);
  }, [resolution]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FPS, fps.toString());
  }, [fps]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WITH_AUDIO, withAudio.toString());
  }, [withAudio]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONVERT_TO_MP4, convertToMp4.toString());
  }, [convertToMp4]);

  return {
    resolution,
    setResolution,
    fps,
    setFps,
    withAudio,
    setWithAudio,
    convertToMp4,
    setConvertToMp4,
    recordingMode,
    setRecordingMode,
  };
}
