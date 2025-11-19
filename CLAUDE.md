# CLAUDE.md - AI Assistant Guide for MacCamera

This document provides comprehensive guidance for AI assistants working on the MacCamera codebase.

## Project Overview

**MacCamera** is a cross-platform desktop webcam recording application built with Electron, React, and TypeScript. It supports high-quality video recording (up to 4K), photo capture, and flexible device selection on macOS and Linux.

### Key Features
- Cross-platform (macOS, Linux, Docker)
- Video recording with WebM (instant) and optional MP4 conversion (background)
- Photo capture in JPEG format
- Multiple resolution support (VGA to 4K)
- Frame rate options (24, 30, 60 fps)
- Audio recording with device selection
- Settings persistence via localStorage

### Technology Stack

**Main Process (Electron/Node.js)**
- TypeScript (target: ES2020)
- Electron 39.x
- FFmpeg (via ffmpeg-static) for video conversion
- Node.js fs promises API for async file operations

**Renderer Process (React)**
- React 18.2 with TypeScript
- Create React App (react-scripts 5.0.1)
- Browser MediaRecorder and MediaStream APIs
- Custom hooks architecture for state management
- CSS3 with modern animations

**Build & Packaging**
- Electron Forge for packaging and distribution
- TypeScript compiler (tsc) for main process
- Webpack (via react-scripts) for renderer
- Docker support for Linux deployment

## Architecture

### Process Model

MacCamera follows Electron's multi-process architecture:

```
┌─────────────────────────────────────────┐
│     Main Process (src/main.ts)          │
│  - Window management                    │
│  - IPC handlers                         │
│  - File system operations               │
│  - FFmpeg video conversion              │
└─────────────────────────────────────────┘
                  ↕ IPC
┌─────────────────────────────────────────┐
│   Preload Script (src/preload.ts)       │
│  - contextBridge API exposure           │
│  - Type-safe IPC communication          │
└─────────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────────┐
│  Renderer Process (renderer/src/)       │
│  - React UI components                  │
│  - MediaRecorder API for recording      │
│  - getUserMedia for camera access       │
│  - Custom hooks for state management    │
└─────────────────────────────────────────┘
```

### Recording Flow

1. **Live Preview**: getUserMedia → MediaStream → video element
2. **Recording**: MediaRecorder captures chunks → Blob accumulation
3. **Save**: Blob → ArrayBuffer → IPC → Main process writes WebM file
4. **Convert** (optional): FFmpeg converts WebM → MP4 (H.264 + AAC)
5. **Cleanup**: Original WebM deleted if conversion succeeds (configurable)

## Directory Structure

```
MacCamera/
├── src/                          # Main process (Electron/Node.js)
│   ├── main.ts                   # Entry point, IPC handlers, window management
│   ├── preload.ts                # Secure IPC bridge via contextBridge
│   └── types/
│       └── shared.ts             # Shared TypeScript types
│
├── renderer/                     # Renderer process (React)
│   ├── src/
│   │   ├── App.tsx               # Main React component (~210 lines)
│   │   ├── App.css               # Application styles
│   │   ├── index.tsx             # React entry, ErrorBoundary wrapper
│   │   ├── index.css             # Global styles
│   │   ├── constants.ts          # Application constants (bitrates, codecs, etc.)
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx # React error boundary
│   │   │   ├── Toast.tsx         # Toast notification component
│   │   │   ├── Toast.css
│   │   │   ├── RecordingTimer.tsx # Recording duration display
│   │   │   └── RecordingTimer.css
│   │   ├── hooks/
│   │   │   ├── useMediaDevices.ts  # Camera/mic device management
│   │   │   ├── useMediaStream.ts   # MediaStream lifecycle
│   │   │   ├── useSettings.ts      # Settings persistence (localStorage)
│   │   │   └── useToast.ts         # Toast notification state
│   │   └── types/
│   │       └── shared.ts         # Shared types (duplicated for renderer)
│   ├── public/
│   │   └── index.html            # HTML shell
│   └── package.json              # Renderer dependencies
│
├── scripts/                      # Build scripts
│   ├── build-macos.sh            # macOS .dmg build
│   └── build-linux.sh            # Linux .deb build
│
├── dist/                         # Compiled main process (gitignored)
├── renderer/build/               # Compiled React app (gitignored)
│
├── Dockerfile                    # Docker image definition
├── docker-compose.yml            # Docker Compose configuration
├── forge.config.js               # Electron Forge packaging config
├── tsconfig.json                 # Main process TypeScript config
├── .eslintrc.js                  # Main process ESLint config
├── .prettierrc                   # Code formatting config
│
├── ARCHITECTURE.md               # Detailed architecture documentation
├── IMPROVEMENTS.md               # Code improvements log
├── README.md                     # User-facing documentation
└── QUICKSTART.md                 # Quick setup guide
```

## Development Workflow

### Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd MacCamera

# Install dependencies (runs postinstall for renderer)
npm install

# Verify renderer dependencies installed
cd renderer && npm install && cd ..
```

### Development Commands

```bash
# Development mode (recommended)
npm run dev
# This runs: tsc -w, cd renderer && npm start, and electron-forge start

# Build main process only
npm run build

# Build renderer only
npm run build:renderer

# Production mode
npm start
```

### Build for Distribution

```bash
# macOS (.dmg)
npm run make
# or
./scripts/build-macos.sh

# Linux (.deb)
npm run make
# or
./scripts/build-linux.sh

# Output in: out/make/
```

### Docker Development

```bash
# Build and run (Linux only)
xhost +local:docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Code Conventions

### TypeScript Standards

**Strict Mode**: Always enabled (`tsconfig.json`)
- No implicit any
- Strict null checks
- Strict function types
- All strict flags enabled

**Type Definitions**
- Shared types in `src/types/shared.ts` and `renderer/src/types/shared.ts`
- All IPC communication uses typed interfaces
- No `any` types allowed in production code
- Use type guards for runtime validation

**Example Type Usage**:
```typescript
// src/types/shared.ts
export interface SaveRecordingData {
  buffer: ArrayBuffer;
  filename: string;
}

export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Usage in main.ts
ipcMain.handle('save-recording', async (_, data: SaveRecordingData): Promise<IPCResponse<SavedRecording>> => {
  if (!validateSaveRecordingData(data)) {
    return { success: false, error: 'Invalid data' };
  }
  // ...
});
```

### React Patterns

**Component Structure**
- Functional components with hooks only (no class components)
- Custom hooks for reusable logic
- ErrorBoundary wraps the entire app
- Toast notifications instead of alert() dialogs

**Hook Dependencies**
- Always specify complete dependency arrays
- Use useCallback for event handlers passed as props
- Use useMemo for expensive computations
- Custom hooks follow `use*` naming convention

**State Management**
- useState for component-local state
- Custom hooks for shared logic (not global state)
- localStorage for settings persistence
- No external state management library (Redux, MobX, etc.)

**Example Custom Hook**:
```typescript
// renderer/src/hooks/useSettings.ts
export function useSettings() {
  const [resolution, setResolution] = useState(() => {
    return localStorage.getItem('resolution') || '1920x1080';
  });

  useEffect(() => {
    localStorage.setItem('resolution', resolution);
  }, [resolution]);

  return { resolution, setResolution };
}
```

### Security Practices

**CRITICAL: All file operations must validate inputs**

1. **Path Sanitization** (src/main.ts:27-32)
   ```typescript
   function sanitizeFilename(filename: string): string {
     const basename = path.basename(filename); // Prevent path traversal
     return basename.replace(/[^a-zA-Z0-9._-]/g, '_'); // Remove dangerous chars
   }
   ```

2. **Input Validation**
   - All IPC handlers validate inputs with type guards
   - See `validateRecordingOptions()`, `validateSaveRecordingData()`, etc.
   - Never trust data from renderer process

3. **Error Sanitization** (src/main.ts:37-42)
   ```typescript
   function createErrorResponse<T>(error: unknown): IPCResponse<T> {
     const message = error instanceof Error ? error.message : 'Unknown error';
     const sanitized = message.replace(/\/[^\s]+/g, '[path]'); // Strip system paths
     return { success: false, error: sanitized };
   }
   ```

4. **Content Security Policy**
   - CSP headers set in main.ts via webRequest.onHeadersReceived
   - Restricts resource loading to prevent XSS

5. **Context Isolation**
   - `contextIsolation: true` in BrowserWindow
   - `nodeIntegration: false`
   - Use contextBridge to expose APIs

### File Operations

**Always use async fs promises API**
```typescript
// ✅ Good
import { promises as fs } from 'fs';
await fs.writeFile(path, buffer);

// ❌ Bad - blocks event loop
import * as fs from 'fs';
fs.writeFileSync(path, buffer);
```

**Check disk space before writing** (src/main.ts:47-56)
```typescript
async function hasEnoughDiskSpace(): Promise<boolean> {
  const stats = await fs.statfs(recordingsDir);
  const freeSpaceMB = (stats.bavail * stats.bsize) / (1024 * 1024);
  return freeSpaceMB > MIN_FREE_SPACE_MB; // 100MB minimum
}
```

### Constants and Magic Numbers

All magic numbers extracted to `renderer/src/constants.ts`:

```typescript
export const VIDEO_BITRATE = 10_000_000; // 10 Mbps
export const RECORDING_TIME_SLICE = 100; // ms
export const JPEG_QUALITY = 1.0; // Maximum quality
export const RESOLUTIONS = [
  { label: '640x480 (VGA)', value: '640x480' },
  // ...
] as const;
```

**Never use magic numbers directly in code**

### Code Style

**Formatting** (enforced by Prettier):
- Single quotes for strings
- 2-space indentation
- 120 character line width
- Trailing commas (ES5)
- LF line endings

**Linting** (ESLint):
- Main process: `@typescript-eslint` rules
- Renderer: `react-app` + `react-hooks` rules
- Warnings on `any` usage
- Console statements allowed (for debugging)

**Run before committing**:
```bash
# Format code
npx prettier --write .

# Lint main process
npx eslint src/

# Lint renderer
cd renderer && npx eslint src/
```

## IPC Communication

### Available IPC Channels

Defined in `src/preload.ts` and `src/main.ts`:

| Channel | Direction | Purpose | Input Type | Return Type |
|---------|-----------|---------|------------|-------------|
| `get-recordings-dir` | → Main | Get recordings directory path | - | `IPCResponse<RecordingsDirectory>` |
| `save-recording` | → Main | Save recorded video to disk | `SaveRecordingData` | `IPCResponse<SavedRecording>` |
| `save-photo` | → Main | Save captured photo to disk | `SaveRecordingData` | `IPCResponse<SavedRecording>` |
| `convert-to-mp4` | → Main | Convert WebM to MP4 | `ConvertToMp4Data` | `IPCResponse<ConvertedRecording>` |
| `open-recordings-folder` | → Main | Open folder in system file manager | - | `void` |
| `conversion-progress` | ← Renderer | FFmpeg conversion progress | - | `{ percent: number }` |

### IPC Usage Pattern

**In Renderer** (TypeScript):
```typescript
// Get recordings directory
const result = await window.electronAPI.getRecordingsDir();
if (result.success && result.data) {
  console.log(result.data.path);
}

// Save recording
const saveResult = await window.electronAPI.saveRecording({
  buffer: arrayBuffer,
  filename: 'recording_123.webm'
});
```

**In Main Process**:
```typescript
ipcMain.handle('save-recording', async (_, data: SaveRecordingData): Promise<IPCResponse<SavedRecording>> => {
  try {
    if (!validateSaveRecordingData(data)) {
      return { success: false, error: 'Invalid data' };
    }
    // ... save file ...
    return { success: true, data: { path: filePath } };
  } catch (error) {
    return createErrorResponse(error);
  }
});
```

## Testing

### Current State
- No automated tests currently implemented
- Manual testing checklist in ARCHITECTURE.md

### Testing Recommendations

**Unit Testing**:
```bash
# Renderer tests (Jest + React Testing Library)
cd renderer
npm test

# Future: Main process tests (Jest)
npm test
```

**Test Files to Create**:
- `renderer/src/hooks/__tests__/useMediaDevices.test.ts`
- `renderer/src/hooks/__tests__/useSettings.test.ts`
- `renderer/src/components/__tests__/Toast.test.tsx`
- `src/__tests__/main.test.ts` (IPC handler tests)

**E2E Testing**:
- Consider Playwright or Spectron for Electron
- Test recording flow end-to-end
- Test device switching
- Test error scenarios

## Common Development Tasks

### Adding a New IPC Handler

1. **Define types** in `src/types/shared.ts`:
   ```typescript
   export interface MyNewData {
     field: string;
   }

   export interface MyNewResponse {
     result: string;
   }
   ```

2. **Add handler** in `src/main.ts`:
   ```typescript
   ipcMain.handle('my-new-handler', async (_, data: MyNewData): Promise<IPCResponse<MyNewResponse>> => {
     try {
       // Validate input
       if (!validateMyNewData(data)) {
         return { success: false, error: 'Invalid data' };
       }
       // Process...
       return { success: true, data: { result: 'done' } };
     } catch (error) {
       return createErrorResponse(error);
     }
   });
   ```

3. **Expose in preload** (`src/preload.ts`):
   ```typescript
   contextBridge.exposeInMainWorld('electronAPI', {
     // ... existing methods ...
     myNewHandler: (data: MyNewData) => ipcRenderer.invoke('my-new-handler', data)
   });
   ```

4. **Add TypeScript declaration** (if needed):
   ```typescript
   // renderer/src/react-app-env.d.ts
   interface ElectronAPI {
     // ... existing methods ...
     myNewHandler: (data: MyNewData) => Promise<IPCResponse<MyNewResponse>>;
   }
   ```

### Adding a New React Component

1. Create component file: `renderer/src/components/MyComponent.tsx`
2. Create styles (optional): `renderer/src/components/MyComponent.css`
3. Follow existing patterns:
   - Functional component with TypeScript
   - Props interface defined
   - Use custom hooks for logic
   - Import types from `types/shared.ts`

### Adding a New Custom Hook

1. Create file: `renderer/src/hooks/useMyHook.ts`
2. Follow naming: `use*` prefix
3. Return object with values and setters
4. Use localStorage for persistence if needed
5. Document the hook's purpose

### Modifying Video Recording Settings

1. **Update constants** in `renderer/src/constants.ts`
2. **Update UI** in `renderer/src/App.tsx`
3. **Update IPC types** in `src/types/shared.ts` if needed
4. **Test** with different devices and settings

### Adding FFmpeg Features

FFmpeg is available via `ffmpeg-static`:

```typescript
// src/main.ts
const ffmpegPath = require('ffmpeg-static');

// Use with fluent-ffmpeg or spawn
const ffmpeg = spawn(ffmpegPath, [args]);
```

**Current FFmpeg usage**: WebM → MP4 conversion (src/main.ts ~line 200+)

## Git Workflow

### Branch Naming

For this repository, feature branches follow the pattern:
```
claude/description-sessionid
```

Example: `claude/fix-mp4-conversion-issue-011CV4cN2XNyXAVBx4B8sECH`

### Committing Changes

**DO**:
- Write descriptive commit messages
- Follow conventional commits style (feat, fix, docs, refactor, etc.)
- Commit related changes together
- Reference issue numbers if applicable

**DON'T**:
- Commit `node_modules/`, `dist/`, `renderer/build/`
- Commit with `--no-verify` (skips hooks)
- Force push to main/master
- Amend commits that are already pushed (unless safe)

### Example Commit Messages

```
fix: resolve MP4 conversion quality issues

- Increase CRF to 23 for better quality
- Add faststart flag for streaming compatibility
- Ensure AAC audio at 192kbps

perf: optimize MediaRecorder chunk collection

- Reduce timeslice from 1000ms to 100ms
- Prevent memory buildup for long recordings

feat: add keyboard shortcuts for recording controls

- Space: start/stop recording
- P: take photo
- Escape: stop recording
- Cmd/Ctrl+O: open recordings folder
```

### Pushing Changes

```bash
# Always specify branch when pushing
git push -u origin claude/your-branch-name-sessionid

# Network retry logic is built into the system
# If push fails with network error, it will retry automatically
```

## Build and Distribution

### Package Structure

**macOS**:
- Output: `out/make/MacCamera.dmg`
- Icon: `assets/icon.icns`
- Format: ULFO (fastest compression)

**Linux**:
- Output: `out/make/deb/x64/maccamera_1.0.0_amd64.deb`
- Icon: `assets/icon.png`
- Categories: AudioVideo, Recorder

### Build Process

1. **Compile TypeScript**: `tsc` → `dist/`
2. **Build React**: `cd renderer && npm run build` → `renderer/build/`
3. **Package Electron**: `npm run make` → `out/`

### FFmpeg Bundling

FFmpeg binary is bundled via `forge.config.js`:
```javascript
extraResource: ['./node_modules/ffmpeg-static']
```

This ensures ffmpeg-static is included in the final package.

## Troubleshooting

### Common Issues

**"Cannot find module" errors**:
```bash
# Reinstall dependencies
rm -rf node_modules renderer/node_modules
npm install
```

**TypeScript compilation errors**:
```bash
# Clean build
rm -rf dist renderer/build
npm run build
```

**Renderer not loading in dev mode**:
- Ensure `renderer/node_modules` exists
- Check that port 3000 is not in use
- Wait for "webpack compiled" message before Electron opens

**Camera/microphone not working**:
- macOS: Check System Preferences → Security & Privacy
- Linux: Ensure user in `video` group
- Docker: Verify device mounting (`--device /dev/video0`)

**FFmpeg conversion fails**:
- Check that ffmpeg-static installed: `ls node_modules/ffmpeg-static`
- Verify disk space (100MB minimum)
- Check logs for FFmpeg errors

### Debugging Tips

**Main Process**:
```bash
# View main process console
npm run dev
# Check terminal output (not DevTools console)
```

**Renderer Process**:
- Open DevTools: View → Toggle Developer Tools
- Check Console, Network, and Application tabs
- React DevTools available in dev mode

**IPC Communication**:
Add logging in both processes:
```typescript
// Main process
ipcMain.handle('my-channel', async (_, data) => {
  console.log('IPC received:', data);
  // ...
});

// Renderer
const result = await window.electronAPI.myHandler(data);
console.log('IPC result:', result);
```

## Performance Considerations

### Recording Performance

**Video Bitrate**: 10 Mbps (configurable via `VIDEO_BITRATE` constant)
- Balance between quality and file size
- Hardware acceleration used when available (VP9/VP8)

**Time Slice**: 100ms (configurable via `RECORDING_TIME_SLICE`)
- Smaller = more frequent ondataavailable events
- Prevents memory buildup during long recordings

**Resolution Impact**:
- 4K recording requires powerful hardware
- Recommend 1080p for most use cases
- Lower resolution if CPU usage too high

### Memory Management

**MediaRecorder Chunks**:
```typescript
// Collect chunks in array
chunksRef.current = [];
mediaRecorder.ondataavailable = (e) => {
  if (e.data.size > 0) {
    chunksRef.current.push(e.data);
  }
};
```

**Cleanup**:
```typescript
// Stop tracks when done
stream.getTracks().forEach(track => track.stop());

// Clear refs
chunksRef.current = [];
mediaRecorderRef.current = null;
```

## Security Checklist for Changes

When modifying code, ensure:

- [ ] All user inputs validated (especially file paths)
- [ ] No `any` types added
- [ ] Async operations use promises (not sync)
- [ ] Errors sanitized before sending to renderer
- [ ] No new security vulnerabilities (XSS, path traversal, etc.)
- [ ] CSP still functional after changes
- [ ] Context isolation maintained

## Resources

### Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

### Project Documentation
- `README.md` - User-facing setup and usage guide
- `ARCHITECTURE.md` - Detailed technical architecture
- `IMPROVEMENTS.md` - Code improvements changelog
- `QUICKSTART.md` - Quick setup guide

### Key Files to Reference
- `src/main.ts` - Main process logic and IPC handlers
- `src/preload.ts` - IPC bridge and API exposure
- `renderer/src/App.tsx` - Main UI component
- `renderer/src/constants.ts` - Application constants
- `forge.config.js` - Packaging configuration

## Summary

MacCamera is a well-architected, security-focused Electron application following modern best practices:

- **Type-safe** throughout with strict TypeScript
- **Secure** with input validation, path sanitization, and CSP
- **Modular** with custom hooks and reusable components
- **Performant** with async operations and hardware acceleration
- **Cross-platform** with shared codebase for macOS and Linux

When making changes:
1. Follow existing patterns and conventions
2. Maintain type safety (no `any`)
3. Validate all inputs
4. Use async file operations
5. Test on multiple platforms
6. Update documentation as needed

For questions or clarifications, refer to the existing codebase patterns and documentation files.
