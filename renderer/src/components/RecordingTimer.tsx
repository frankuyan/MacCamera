import React, { useEffect, useState } from 'react';
import './RecordingTimer.css';

interface RecordingTimerProps {
  isRecording: boolean;
}

const RecordingTimer: React.FC<RecordingTimerProps> = ({ isRecording }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <div className="recording-timer">
      <span className="timer-dot">●</span>
      <span className="timer-text">{formatTime(seconds)}</span>
    </div>
  );
};

export default RecordingTimer;
