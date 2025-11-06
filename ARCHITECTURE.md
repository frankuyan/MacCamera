# MacCamera Architecture

## Overview

MacCamera is built using Electron + React with a clean separation between the main process (Node.js) and renderer process (React web app).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│                      (src/main.ts)                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - Window Management                                │ │
│  │  - IPC Handlers (device detection, file saving)    │ │
│  │  - File System Operations                          │ │
│  │  - FFmpeg Integration (future)                     │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↕ IPC
┌─────────────────────────────────────────────────────────┐
│                  Preload Script (Bridge)                 │
│                   (src/preload.ts)                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - Secure IPC Exposure via contextBridge           │ │
│  │  - Type-safe API for renderer                      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              React Renderer Process (GUI)                │
│              (renderer/src/App.tsx)                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - Camera Preview (MediaStream API)                │ │
│  │  - Recording Controls (MediaRecorder API)          │ │
│  │  - Device Selection UI                             │ │
│  │  - Settings Panel                                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Browser APIs                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - navigator.mediaDevices (device enumeration)     │ │
│  │  - getUserMedia (camera/mic access)                │ │
│  │  - MediaRecorder (video recording)                 │ │
│  │  - Canvas API (photo capture)                      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Main Process (Backend)
- **TypeScript**: Type-safe Node.js code
- **Electron**: Cross-platform desktop framework
- **Node.js APIs**: File system, child processes
- **ffmpeg-static**: High-quality media processing (included, ready for advanced features)

### Renderer Process (Frontend)
- **React 18**: Modern UI framework
- **TypeScript**: Type-safe React components
- **CSS3**: Modern styling with gradients and animations
- **Browser Media APIs**: Native webcam/microphone access

### Build Tools
- **TypeScript Compiler**: Transpiles TS to JS
- **React Scripts**: Webpack-based React build system
- **Electron Forge**: Packaging and distribution
- **Docker**: Containerization for Linux deployment

## Data Flow

### Recording Flow

1. **Device Selection**
   ```
   User selects camera → React state update → getUserMedia with constraints
   → MediaStream → Video element srcObject → Live preview
   ```

2. **Start Recording**
   ```
   Click "Start Recording" → Create MediaRecorder with high bitrate
   → Collect data chunks → Store in memory
   ```

3. **Stop Recording & Convert**
   ```
   Click "Stop Recording" → MediaRecorder.stop()
   → Combine chunks into Blob → Convert to ArrayBuffer
   → IPC to main process → Save WebM to disk
   → FFmpeg conversion: WebM → MP4 (H.264 + AAC)
   → Delete WebM → Show MP4 path to user
   ```

### Photo Capture Flow

```
Click "Take Photo" → Canvas drawImage from video element
→ toBlob as JPEG → IPC to main process → Save to disk
```

## File Structure

```
MacCamera/
├── src/                    # Main process (Node.js/Electron)
│   ├── main.ts            # Entry point, window management, IPC handlers
│   └── preload.ts         # Secure IPC bridge
│
├── renderer/              # Renderer process (React)
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── App.css        # Styles
│   │   ├── index.tsx      # React entry point
│   │   └── react-app-env.d.ts  # Type declarations
│   ├── public/
│   │   └── index.html     # HTML shell
│   └── build/             # Compiled React app
│
├── scripts/               # Build automation
│   ├── build-macos.sh
│   └── build-linux.sh
│
├── dist/                  # Compiled Electron code
│   ├── main.js
│   └── preload.js
│
├── Dockerfile             # Container definition
├── docker-compose.yml     # Docker orchestration
├── forge.config.js        # Electron packaging config
└── package.json           # Dependencies and scripts
```

## Key Design Decisions

### Hybrid Recording Architecture

**Recording**: Browser's native MediaRecorder API
- ✓ Hardware acceleration built-in
- ✓ Real-time recording with VP9/VP8 codec
- ✓ Cross-platform without OS-specific code
- ✓ Minimal latency during recording

**Post-Processing**: FFmpeg for MP4 Conversion
- ✓ Automatic WebM → MP4 conversion
- ✓ H.264 (libx264) for universal compatibility
- ✓ AAC audio encoding
- ✓ Fast-start optimization for streaming
- ✓ Original WebM file auto-deleted after conversion

This hybrid approach provides the best of both worlds: fast recording with maximum compatibility.

### Security: Context Isolation

The preload script uses `contextBridge` to safely expose only specific IPC methods to the renderer process, preventing security vulnerabilities.

```typescript
// Preload creates a safe API
contextBridge.exposeInMainWorld('electronAPI', {
  saveRecording: (data) => ipcRenderer.invoke('save-recording', data)
});

// Renderer can only call exposed methods
window.electronAPI.saveRecording(data);
```

### Cross-Platform Compatibility

- **macOS**: Native experience, .dmg installer
- **Linux**: .deb package, Docker support with X11
- **Shared**: Same codebase, same features

## Performance Optimizations

1. **High Bitrate Recording**: 10 Mbps for excellent quality
2. **Hardware Acceleration**: VP9 codec uses GPU when available
3. **Efficient Data Collection**: 100ms chunks prevent memory issues
4. **Lazy Loading**: Devices enumerated only when needed

## Future Enhancement Points

1. **FFmpeg Integration** (already included)
   - Add format conversion options
   - Implement video filters
   - Support more codecs

2. **Advanced Features**
   - Screen recording
   - Picture-in-picture
   - Scheduled recording
   - Cloud upload

3. **Performance**
   - Worker threads for encoding
   - Streaming to disk (large files)
   - Hardware encoder selection

## Testing

### Manual Testing Checklist
- [ ] Camera detection works
- [ ] Audio device selection
- [ ] Video recording saves correctly
- [ ] Photo capture works
- [ ] File path shown correctly
- [ ] "Open Folder" button works
- [ ] Multiple resolution settings
- [ ] Different frame rates

### Platform Testing
- [ ] macOS 12+ (Monterey)
- [ ] macOS 13+ (Ventura)
- [ ] Ubuntu 20.04+
- [ ] Debian 11+
- [ ] Docker on Linux

## Deployment

### Native Apps
```bash
# macOS
npm run make  # Creates .dmg

# Linux
npm run make  # Creates .deb
```

### Docker Container
```bash
docker-compose up -d
```

## References

- [Electron Documentation](https://www.electronjs.org/docs)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [React Documentation](https://react.dev/)
