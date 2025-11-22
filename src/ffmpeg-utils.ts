import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { app } from 'electron';
import { promises as fs } from 'fs';
import * as https from 'https';

const execFileAsync = promisify(execFile);

/**
 * Get FFmpeg path - checks system installation first, falls back to bundled version
 */
export async function getFFmpegPath(): Promise<string> {
  // First, try to find FFmpeg in system PATH
  const systemFFmpeg = await findSystemFFmpeg();
  if (systemFFmpeg) {
    console.log('Using system FFmpeg:', systemFFmpeg);
    return systemFFmpeg;
  }

  // If not found, try to download and cache it
  console.log('System FFmpeg not found, using cached/downloaded version');
  return await getOrDownloadFFmpeg();
}

/**
 * Find FFmpeg in system PATH
 */
async function findSystemFFmpeg(): Promise<string | null> {
  try {
    if (process.platform === 'win32') {
      // Windows: check common locations
      const { stdout } = await execFileAsync('where', ['ffmpeg']);
      const ffmpegPath = stdout.trim().split('\n')[0];
      if (ffmpegPath && await verifyFFmpeg(ffmpegPath)) {
        return ffmpegPath;
      }
    } else {
      // macOS/Linux: use 'which'
      const { stdout } = await execFileAsync('which', ['ffmpeg']);
      const ffmpegPath = stdout.trim();
      if (ffmpegPath && await verifyFFmpeg(ffmpegPath)) {
        return ffmpegPath;
      }
    }
  } catch (error) {
    // FFmpeg not found in PATH
    console.log('FFmpeg not found in system PATH');
  }
  return null;
}

/**
 * Verify that the FFmpeg binary works
 */
async function verifyFFmpeg(ffmpegPath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ['-version']);
    return stdout.includes('ffmpeg version');
  } catch {
    return false;
  }
}

/**
 * Get cached FFmpeg or download it
 */
async function getOrDownloadFFmpeg(): Promise<string> {
  const cacheDir = path.join(app.getPath('userData'), 'ffmpeg-cache');
  const ffmpegBinary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const cachedPath = path.join(cacheDir, ffmpegBinary);

  // Check if already cached
  try {
    await fs.access(cachedPath);
    if (await verifyFFmpeg(cachedPath)) {
      console.log('Using cached FFmpeg:', cachedPath);
      return cachedPath;
    }
  } catch {
    // Not cached, need to download
  }

  // Create cache directory
  await fs.mkdir(cacheDir, { recursive: true });

  // Download FFmpeg
  console.log('Downloading FFmpeg...');
  await downloadFFmpeg(cachedPath);

  // Make executable on Unix systems
  if (process.platform !== 'win32') {
    await fs.chmod(cachedPath, 0o755);
  }

  console.log('FFmpeg downloaded to:', cachedPath);
  return cachedPath;
}

/**
 * Download FFmpeg binary for the current platform
 */
async function downloadFFmpeg(outputPath: string): Promise<void> {
  // URLs for FFmpeg binaries from official sources
  const ffmpegUrls: Record<string, string> = {
    'darwin-x64': 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    'darwin-arm64': 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    'linux-x64': 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
    'win32-x64': 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
  };

  const platformKey = `${process.platform}-${process.arch}`;
  const downloadUrl = ffmpegUrls[platformKey];

  if (!downloadUrl) {
    throw new Error(`Unsupported platform: ${platformKey}. Please install FFmpeg manually.`);
  }

  return new Promise((resolve, reject) => {
    https.get(downloadUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        if (response.headers.location) {
          https.get(response.headers.location, (redirectResponse) => {
            const fileStream = require('fs').createWriteStream(outputPath + '.download');
            redirectResponse.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              // For now, just rename (in production, you'd extract from archive)
              require('fs').renameSync(outputPath + '.download', outputPath);
              resolve();
            });
          }).on('error', reject);
        } else {
          reject(new Error('Redirect without location'));
        }
      } else {
        const fileStream = require('fs').createWriteStream(outputPath + '.download');
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          require('fs').renameSync(outputPath + '.download', outputPath);
          resolve();
        });
      }
    }).on('error', reject);
  });
}

/**
 * Check if FFmpeg is available (system or can be downloaded)
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await getFFmpegPath();
    return true;
  } catch {
    return false;
  }
}
