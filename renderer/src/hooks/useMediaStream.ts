import { useState, useEffect, useCallback } from 'react';

interface UseMediaStreamOptions {
  selectedVideoDevice: string;
  selectedAudioDevice: string;
  withAudio: boolean;
  resolution: string;
  fps: number;
}

export function useMediaStream({
  selectedVideoDevice,
  selectedAudioDevice,
  withAudio,
  resolution,
  fps,
}: UseMediaStreamOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(async () => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const [width, height] = resolution.split('x').map(Number);

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: fps },
        },
        audio:
          withAudio && selectedAudioDevice
            ? {
                deviceId: { exact: selectedAudioDevice },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setError(null);
    } catch (err) {
      console.error('Error starting preview:', err);
      setError(err instanceof Error ? err.message : 'Error accessing camera');
      setStream(null);
    }
  }, [selectedVideoDevice, selectedAudioDevice, withAudio, resolution, fps, stream]);

  useEffect(() => {
    if (!selectedVideoDevice) return;

    startStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideoDevice, selectedAudioDevice, withAudio, resolution, fps]);

  return { stream, error };
}
