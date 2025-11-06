import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

const ffmpegPath = require('ffmpeg-static');

let mainWindow: BrowserWindow | null = null;
let recordingProcess: ChildProcess | null = null;
let recordingsDir: string;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    title: 'MacCamera',
  });

  // In development, load from React dev server
  // In production, load from built files
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (recordingProcess) {
      recordingProcess.kill('SIGINT');
    }
  });
}

app.whenReady().then(() => {
  // Initialize recordings directory after app is ready
  recordingsDir = path.join(app.getPath('documents'), 'MacCamera');

  // Ensure recordings directory exists
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Get available video devices
ipcMain.handle('get-video-devices', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
    });

    // For actual webcam devices, we'll rely on the browser's navigator.mediaDevices
    // This handler is mainly for fallback/additional info
    return { success: true, sources };
  } catch (error) {
    console.error('Error getting video devices:', error);
    return { success: false, error: String(error) };
  }
});

// Get available audio devices
ipcMain.handle('get-audio-devices', async () => {
  // Audio devices are handled by the renderer process via navigator.mediaDevices
  return { success: true };
});

// Start recording with FFmpeg
ipcMain.handle('start-recording', async (event, options: {
  deviceId: string;
  audioDeviceId?: string;
  mode: 'video' | 'photo';
  withAudio: boolean;
  resolution: string;
  fps: number;
}) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(
      recordingsDir,
      `recording-${timestamp}.${options.mode === 'photo' ? 'jpg' : 'mp4'}`
    );

    // For photo mode, we'll handle it differently (capture from stream)
    if (options.mode === 'photo') {
      return {
        success: true,
        message: 'Photo mode - capture from stream',
        path: outputPath,
      };
    }

    // For video recording, we'll use the MediaRecorder API in the renderer
    // and save the blob here when stopped
    return {
      success: true,
      message: 'Recording started',
      path: outputPath,
    };
  } catch (error) {
    console.error('Error starting recording:', error);
    return { success: false, error: String(error) };
  }
});

// Stop recording
ipcMain.handle('stop-recording', async () => {
  try {
    if (recordingProcess) {
      recordingProcess.kill('SIGINT');
      recordingProcess = null;
    }
    return { success: true };
  } catch (error) {
    console.error('Error stopping recording:', error);
    return { success: false, error: String(error) };
  }
});

// Save recorded video blob
ipcMain.handle('save-recording', async (event, data: {
  buffer: ArrayBuffer;
  filename: string;
}) => {
  try {
    const outputPath = path.join(recordingsDir, data.filename);
    const buffer = Buffer.from(data.buffer);
    fs.writeFileSync(outputPath, buffer);

    return { success: true, path: outputPath };
  } catch (error) {
    console.error('Error saving recording:', error);
    return { success: false, error: String(error) };
  }
});

// Convert WebM to MP4 using FFmpeg
ipcMain.handle('convert-to-mp4', async (event, data: {
  webmPath: string;
  mp4Filename: string;
  keepWebm?: boolean;
}) => {
  try {
    const mp4Path = path.join(recordingsDir, data.mp4Filename);

    return new Promise((resolve) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-i', data.webmPath,
        '-c:v', 'libx264',       // H.264 video codec
        '-preset', 'medium',      // Encoding speed/quality tradeoff
        '-crf', '23',             // Quality (lower = better, 23 is good default)
        '-c:a', 'aac',            // AAC audio codec
        '-b:a', '192k',           // Audio bitrate
        '-movflags', '+faststart', // Enable streaming
        '-y',                     // Overwrite output file
        mp4Path
      ]);

      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          // Conversion successful
          // Only delete WebM if keepWebm is false
          if (!data.keepWebm) {
            try {
              fs.unlinkSync(data.webmPath);
            } catch (err) {
              console.error('Error deleting WebM file:', err);
            }
          }
          resolve({ success: true, path: mp4Path });
        } else {
          console.error('FFmpeg error:', errorOutput);
          resolve({ success: false, error: `FFmpeg exited with code ${code}` });
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('FFmpeg spawn error:', err);
        resolve({ success: false, error: String(err) });
      });
    });
  } catch (error) {
    console.error('Error converting to MP4:', error);
    return { success: false, error: String(error) };
  }
});

// Get recordings directory
ipcMain.handle('get-recordings-dir', async () => {
  return { success: true, path: recordingsDir };
});

// Open recordings folder
ipcMain.handle('open-recordings-folder', async () => {
  try {
    const { shell } = require('electron');
    await shell.openPath(recordingsDir);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
