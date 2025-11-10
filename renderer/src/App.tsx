import React, { useRef, useEffect, useState, useCallback } from 'react';
import './App.css';
import Toast from './components/Toast';
import RecordingTimer from './components/RecordingTimer';
import { useMediaDevices } from './hooks/useMediaDevices';
import { useMediaStream } from './hooks/useMediaStream';
import { useSettings } from './hooks/useSettings';
import { useToast } from './hooks/useToast';
import {
  VIDEO_BITRATE,
  RECORDING_TIME_SLICE,
  JPEG_QUALITY,
  RESOLUTIONS,
  FRAME_RATES,
  CODEC_PREFERENCES,
} from './constants';

function App() {
  // Hooks
  const { toasts, hideToast, success, error: showError, info } = useToast();
  const {
    videoDevices,
    audioDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    setSelectedVideoDevice,
    setSelectedAudioDevice,
  } = useMediaDevices();
  const {
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
  } = useSettings();
  const { stream, error: streamError } = useMediaStream({
    selectedVideoDevice,
    selectedAudioDevice,
    withAudio,
    resolution,
    fps,
  });

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [recordingsDir, setRecordingsDir] = useState<string>('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Display stream errors
  useEffect(() => {
    if (streamError) {
      showError(`Camera error: ${streamError}`);
    }
  }, [streamError, showError]);

  // Get recordings directory
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getRecordingsDir().then((result) => {
        if (result.success && result.data) {
          setRecordingsDir(result.data.path);
        }
      });
    }
  }, []);

  // Set video element source when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Get best available codec
  const getBestCodec = useCallback((): string => {
    for (const codec of CODEC_PREFERENCES) {
      if (MediaRecorder.isTypeSupported(codec)) {
        return codec;
      }
    }
    return 'video/webm'; // Fallback
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!stream) return;

    try {
      chunksRef.current = [];

      const mimeType = getBestCodec();
      const options = {
        mimeType,
        videoBitsPerSecond: VIDEO_BITRATE,
      };

      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const buffer = await blob.arrayBuffer();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const webmFilename = `recording-${timestamp}.webm`;
        const mp4Filename = `recording-${timestamp}.mp4`;

        if (window.electronAPI) {
          try {
            // First save the WebM file
            const saveResult = await window.electronAPI.saveRecording({
              buffer,
              filename: webmFilename,
            });

            if (saveResult.success && saveResult.data) {
              info('Recording saved as WebM');

              // If user wants MP4, convert in background
              if (convertToMp4) {
                setIsConverting(true);

                // Convert to MP4 in background
                const convertResult = await window.electronAPI.convertToMp4({
                  webmPath: saveResult.data.path,
                  mp4Filename: mp4Filename,
                  keepWebm: true, // Keep the original WebM file
                });

                setIsConverting(false);

                if (convertResult.success && convertResult.data) {
                  success(`Recording saved!\nMP4: ${convertResult.data.path}\nWebM: ${saveResult.data.path}`);
                } else {
                  showError(`MP4 conversion failed: ${convertResult.error || 'Unknown error'}`);
                }
              } else {
                success(`Recording saved to: ${saveResult.data.path}`);
              }
            } else {
              showError(`Error saving recording: ${saveResult.error || 'Unknown error'}`);
            }
          } catch (err) {
            showError(`Error saving recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      };

      mediaRecorder.start(RECORDING_TIME_SLICE);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      info('Recording started');
    } catch (err) {
      console.error('Error starting recording:', err);
      showError(`Error starting recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [stream, getBestCodec, convertToMp4, info, success, showError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      info('Recording stopped');
    }
  }, [isRecording, info]);

  // Take photo
  const takePhoto = useCallback(async () => {
    if (!videoRef.current || !stream) return;

    try {
      const canvas = document.createElement('canvas');
      const [width, height] = resolution.split('x').map(Number);
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const buffer = await blob.arrayBuffer();
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `photo-${timestamp}.jpg`;

              if (window.electronAPI) {
                const result = await window.electronAPI.saveRecording({
                  buffer,
                  filename,
                });

                if (result.success && result.data) {
                  success(`Photo saved to: ${result.data.path}`);
                } else {
                  showError(`Error saving photo: ${result.error || 'Unknown error'}`);
                }
              }
            }
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      showError(`Error taking photo: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [stream, resolution, success, showError]);

  // Open recordings folder
  const openRecordingsFolder = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.openRecordingsFolder();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space: Start/Stop recording (when in video mode)
      if (e.code === 'Space' && !isRecording && recordingMode === 'video') {
        e.preventDefault();
        startRecording();
      } else if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        stopRecording();
      }

      // P: Take photo (when in photo mode)
      if (e.code === 'KeyP' && recordingMode === 'photo') {
        e.preventDefault();
        takePhoto();
      }

      // Cmd/Ctrl + O: Open recordings folder
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyO') {
        e.preventDefault();
        openRecordingsFolder();
      }

      // Escape: Stop recording if recording
      if (e.code === 'Escape' && isRecording) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, recordingMode, startRecording, stopRecording, takePhoto, openRecordingsFolder]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>MacCamera</h1>
        <p className="subtitle">Cross-platform Webcam Recording</p>
      </header>

      <div className="main-content">
        <div className="video-container">
          <video ref={videoRef} autoPlay playsInline muted className="video-preview" />
          {isRecording && <div className="recording-indicator">● REC</div>}
          <RecordingTimer isRecording={isRecording} />
        </div>

        <div className="controls-panel">
          <div className="control-group">
            <label>Mode:</label>
            <div className="mode-buttons">
              <button
                className={recordingMode === 'video' ? 'active' : ''}
                onClick={() => setRecordingMode('video')}
                disabled={isRecording}
              >
                Video
              </button>
              <button
                className={recordingMode === 'photo' ? 'active' : ''}
                onClick={() => setRecordingMode('photo')}
                disabled={isRecording}
              >
                Photo
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Camera:</label>
            <select
              value={selectedVideoDevice}
              onChange={(e) => setSelectedVideoDevice(e.target.value)}
              disabled={isRecording}
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={withAudio}
                onChange={(e) => setWithAudio(e.target.checked)}
                disabled={isRecording}
              />
              Enable Audio
            </label>
          </div>

          {withAudio && (
            <div className="control-group">
              <label>Microphone:</label>
              <select
                value={selectedAudioDevice}
                onChange={(e) => setSelectedAudioDevice(e.target.value)}
                disabled={isRecording}
              >
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="control-group">
            <label>Resolution:</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              disabled={isRecording}
            >
              {RESOLUTIONS.map((res) => (
                <option key={res.value} value={res.value}>
                  {res.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Frame Rate:</label>
            <select value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={isRecording}>
              {FRAME_RATES.map((rate) => (
                <option key={rate.value} value={rate.value}>
                  {rate.label}
                </option>
              ))}
            </select>
          </div>

          {recordingMode === 'video' && (
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={convertToMp4}
                  onChange={(e) => setConvertToMp4(e.target.checked)}
                  disabled={isRecording || isConverting}
                />
                Convert to MP4 (background)
              </label>
              {isConverting && <p className="converting-status">Converting to MP4...</p>}
            </div>
          )}

          <div className="action-buttons">
            {recordingMode === 'video' ? (
              <>
                {!isRecording ? (
                  <button className="record-button" onClick={startRecording}>
                    ● Start Recording
                  </button>
                ) : (
                  <button className="stop-button" onClick={stopRecording}>
                    ■ Stop Recording
                  </button>
                )}
              </>
            ) : (
              <button className="photo-button" onClick={takePhoto}>
                Take Photo
              </button>
            )}
          </div>

          <div className="keyboard-shortcuts">
            <details>
              <summary>Keyboard Shortcuts</summary>
              <ul>
                <li>
                  <kbd>Space</kbd> - Start/Stop recording
                </li>
                <li>
                  <kbd>P</kbd> - Take photo
                </li>
                <li>
                  <kbd>Cmd/Ctrl</kbd> + <kbd>O</kbd> - Open recordings folder
                </li>
                <li>
                  <kbd>Esc</kbd> - Stop recording
                </li>
              </ul>
            </details>
          </div>

          <div className="info-section">
            <p className="recordings-path">
              Recordings saved to: <br />
              <span className="path">{recordingsDir || 'Loading...'}</span>
            </p>
            <button className="folder-button" onClick={openRecordingsFolder}>
              Open Recordings Folder
            </button>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </div>
  );
}

export default App;
