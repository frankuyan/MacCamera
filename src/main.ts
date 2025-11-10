import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { promises as fs } from 'fs';
import { spawn, ChildProcess } from 'child_process';
import {
  RecordingOptions,
  SaveRecordingData,
  ConvertToMp4Data,
  IPCResponse,
  RecordingsDirectory,
  SavedRecording,
  ConvertedRecording
} from './types/shared';

const ffmpegPath = require('ffmpeg-static');

let mainWindow: BrowserWindow | null = null;
let recordingProcess: ChildProcess | null = null;
let recordingsDir: string;

// Constants
const MIN_FREE_SPACE_MB = 100; // Minimum 100MB free space required

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFilename(filename: string): string {
  // Extract basename to prevent path traversal
  const basename = path.basename(filename);
  // Remove any characters that aren't alphanumeric, dash, underscore, or dot
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Create sanitized error response
 */
function createErrorResponse<T = never>(error: unknown): IPCResponse<T> {
  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  // Don't expose stack traces or system paths to renderer
  const sanitizedMessage = message.replace(/\/[^\s]+/g, '[path]');
  return { success: false, error: sanitizedMessage };
}

/**
 * Check available disk space
 */
async function hasEnoughDiskSpace(): Promise<boolean> {
  try {
    const stats = await fs.statfs(recordingsDir);
    const freeSpaceMB = (stats.bavail * stats.bsize) / (1024 * 1024);
    return freeSpaceMB > MIN_FREE_SPACE_MB;
  } catch (error) {
    console.error('Error checking disk space:', error);
    return true; // Fail open to allow recording if check fails
  }
}

/**
 * Validate recording options
 */
function validateRecordingOptions(options: any): options is RecordingOptions {
  return (
    typeof options === 'object' &&
    typeof options.deviceId === 'string' &&
    (options.audioDeviceId === undefined || typeof options.audioDeviceId === 'string') &&
    (options.mode === 'video' || options.mode === 'photo') &&
    typeof options.withAudio === 'boolean' &&
    typeof options.resolution === 'string' &&
    typeof options.fps === 'number'
  );
}

/**
 * Validate save recording data
 */
function validateSaveRecordingData(data: any): data is SaveRecordingData {
  return (
    typeof data === 'object' &&
    data.buffer instanceof ArrayBuffer &&
    typeof data.filename === 'string'
  );
}

/**
 * Validate convert to MP4 data
 */
function validateConvertToMp4Data(data: any): data is ConvertToMp4Data {
  return (
    typeof data === 'object' &&
    typeof data.webmPath === 'string' &&
    typeof data.mp4Filename === 'string' &&
    (data.keepWebm === undefined || typeof data.keepWebm === 'boolean')
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Add Content Security Policy
      sandbox: false, // Need false for preload script
    },
    titleBarStyle: 'hiddenInset',
    title: 'MacCamera',
  });

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "media-src 'self' blob: mediastream:; " +
          "img-src 'self' data: blob:;"
        ]
      }
    });
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

app.whenReady().then(async () => {
  // Initialize recordings directory after app is ready
  recordingsDir = path.join(app.getPath('documents'), 'MacCamera');

  // Ensure recordings directory exists
  try {
    await fs.mkdir(recordingsDir, { recursive: true });
  } catch (error) {
    console.error('Error creating recordings directory:', error);
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
ipcMain.handle('get-video-devices', async (): Promise<IPCResponse> => {
  try {
    // Webcam devices are handled by the browser's navigator.mediaDevices
    // This handler is mainly for fallback/additional info
    return { success: true };
  } catch (error) {
    console.error('Error getting video devices:', error);
    return createErrorResponse(error);
  }
});

// Get available audio devices
ipcMain.handle('get-audio-devices', async (): Promise<IPCResponse> => {
  try {
    // Audio devices are handled by the renderer process via navigator.mediaDevices
    return { success: true };
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return createErrorResponse(error);
  }
});

// Start recording with FFmpeg
ipcMain.handle('start-recording', async (event, options: unknown): Promise<IPCResponse> => {
  try {
    // Validate input
    if (!validateRecordingOptions(options)) {
      return { success: false, error: 'Invalid recording options' };
    }

    // Check disk space
    const hasSpace = await hasEnoughDiskSpace();
    if (!hasSpace) {
      return {
        success: false,
        error: `Insufficient disk space. At least ${MIN_FREE_SPACE_MB}MB required.`
      };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.${options.mode === 'photo' ? 'jpg' : 'mp4'}`;
    const outputPath = path.join(recordingsDir, filename);

    // For photo mode, we'll handle it differently (capture from stream)
    if (options.mode === 'photo') {
      return {
        success: true,
        data: {
          message: 'Photo mode - capture from stream',
          path: outputPath,
        }
      };
    }

    // For video recording, we'll use the MediaRecorder API in the renderer
    // and save the blob here when stopped
    return {
      success: true,
      data: {
        message: 'Recording started',
        path: outputPath,
      }
    };
  } catch (error) {
    console.error('Error starting recording:', error);
    return createErrorResponse(error);
  }
});

// Stop recording
ipcMain.handle('stop-recording', async (): Promise<IPCResponse> => {
  try {
    if (recordingProcess) {
      recordingProcess.kill('SIGINT');
      recordingProcess = null;
    }
    return { success: true };
  } catch (error) {
    console.error('Error stopping recording:', error);
    return createErrorResponse(error);
  }
});

// Save recorded video blob
ipcMain.handle('save-recording', async (event, data: unknown): Promise<IPCResponse<SavedRecording>> => {
  try {
    // Validate input
    if (!validateSaveRecordingData(data)) {
      return { success: false, error: 'Invalid recording data' };
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = sanitizeFilename(data.filename);
    const outputPath = path.join(recordingsDir, sanitizedFilename);

    // Check disk space
    const hasSpace = await hasEnoughDiskSpace();
    if (!hasSpace) {
      return {
        success: false,
        error: `Insufficient disk space. At least ${MIN_FREE_SPACE_MB}MB required.`
      };
    }

    // Use async file operations
    const buffer = Buffer.from(data.buffer);
    await fs.writeFile(outputPath, buffer);

    return { success: true, data: { path: outputPath } };
  } catch (error) {
    console.error('Error saving recording:', error);
    return createErrorResponse(error);
  }
});

// Convert WebM to MP4 using FFmpeg
ipcMain.handle('convert-to-mp4', async (event, data: unknown): Promise<IPCResponse<ConvertedRecording>> => {
  try {
    // Validate input
    if (!validateConvertToMp4Data(data)) {
      return { success: false, error: 'Invalid conversion data' };
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(data.mp4Filename);
    const mp4Path = path.join(recordingsDir, sanitizedFilename);

    // Verify input file exists
    try {
      await fs.access(data.webmPath);
    } catch {
      return { success: false, error: 'Input file not found' };
    }

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

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          // Conversion successful
          // Only delete WebM if keepWebm is false
          if (!data.keepWebm) {
            try {
              await fs.unlink(data.webmPath);
            } catch (err) {
              console.error('Error deleting WebM file:', err);
            }
          }
          resolve({ success: true, data: { path: mp4Path } });
        } else {
          console.error('FFmpeg error:', errorOutput);
          resolve({ success: false, error: `Conversion failed with code ${code}` });
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('FFmpeg spawn error:', err);
        resolve(createErrorResponse(err));
      });
    });
  } catch (error) {
    console.error('Error converting to MP4:', error);
    return createErrorResponse(error);
  }
});

// Get recordings directory
ipcMain.handle('get-recordings-dir', async (): Promise<IPCResponse<RecordingsDirectory>> => {
  try {
    return { success: true, data: { path: recordingsDir } };
  } catch (error) {
    console.error('Error getting recordings directory:', error);
    return createErrorResponse(error);
  }
});

// Open recordings folder
ipcMain.handle('open-recordings-folder', async (): Promise<IPCResponse> => {
  try {
    const { shell } = require('electron');
    await shell.openPath(recordingsDir);
    return { success: true };
  } catch (error) {
    console.error('Error opening recordings folder:', error);
    return createErrorResponse(error);
  }
});
