import React, { useState, useRef, useEffect } from 'react';
import './App.css';

interface Device {
  deviceId: string;
  label: string;
  kind: string;
}

type RecordingMode = 'video' | 'photo';

function App() {
  const [videoDevices, setVideoDevices] = useState<Device[]>([]);
  const [audioDevices, setAudioDevices] = useState<Device[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('video');
  const [withAudio, setWithAudio] = useState(true);
  const [resolution, setResolution] = useState('1920x1080');
  const [fps, setFps] = useState(30);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingsDir, setRecordingsDir] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const videoInputs = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
            kind: device.kind,
          }));

        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
            kind: device.kind,
          }));

        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);

        if (videoInputs.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
        if (audioInputs.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };

    getDevices();

    // Get recordings directory
    if (window.electronAPI) {
      window.electronAPI.getRecordingsDir().then((result: any) => {
        if (result.success) {
          setRecordingsDir(result.path);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start camera preview
  useEffect(() => {
    if (!selectedVideoDevice) return;

    const startPreview = async () => {
      try {
        // Stop existing stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const [width, height] = resolution.split('x').map(Number);

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: fps },
          },
          audio: withAudio && selectedAudioDevice ? {
            deviceId: { exact: selectedAudioDevice },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } : false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (error) {
        console.error('Error starting preview:', error);
        alert('Error accessing camera: ' + error);
      }
    };

    startPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideoDevice, selectedAudioDevice, withAudio, resolution, fps]);

  const startRecording = async () => {
    if (!stream) return;

    try {
      chunksRef.current = [];

      // Use the highest quality settings available
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 10000000, // 10 Mbps for high quality
      };

      // Try different codecs if VP9 is not supported
      let mimeType = options.mimeType;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        ...options,
        mimeType,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const buffer = await blob.arrayBuffer();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `recording-${timestamp}.webm`;

        if (window.electronAPI) {
          const result = await window.electronAPI.saveRecording({
            buffer,
            filename,
          });

          if (result.success) {
            alert(`Recording saved to: ${result.path}`);
          } else {
            alert('Error saving recording: ' + result.error);
          }
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording: ' + error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current || !stream) return;

    try {
      const canvas = document.createElement('canvas');
      const [width, height] = resolution.split('x').map(Number);
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const buffer = await blob.arrayBuffer();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `photo-${timestamp}.jpg`;

            if (window.electronAPI) {
              const result = await window.electronAPI.saveRecording({
                buffer,
                filename,
              });

              if (result.success) {
                alert(`Photo saved to: ${result.path}`);
              } else {
                alert('Error saving photo: ' + result.error);
              }
            }
          }
        }, 'image/jpeg', 1.0); // Maximum quality
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      alert('Error taking photo: ' + error);
    }
  };

  const openRecordingsFolder = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openRecordingsFolder();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>MacCamera</h1>
        <p className="subtitle">Cross-platform Webcam Recording</p>
      </header>

      <div className="main-content">
        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video-preview"
          />
          {isRecording && <div className="recording-indicator">● REC</div>}
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
              {videoDevices.map(device => (
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
                {audioDevices.map(device => (
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
              <option value="640x480">640x480 (VGA)</option>
              <option value="1280x720">1280x720 (HD)</option>
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="2560x1440">2560x1440 (QHD)</option>
              <option value="3840x2160">3840x2160 (4K)</option>
            </select>
          </div>

          <div className="control-group">
            <label>Frame Rate:</label>
            <select
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              disabled={isRecording}
            >
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>

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
                📷 Take Photo
              </button>
            )}
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
    </div>
  );
}

export default App;
