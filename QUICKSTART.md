# MacCamera Quick Start Guide

## Installation Complete! ✓

Your cross-platform webcam recording application is ready to use.

## How to Run

### Option 1: Quick Start (Recommended)
```bash
npm start
```

### Option 2: Use the convenience script
```bash
./start-app.sh
```

### Option 3: Development Mode (with hot reload)
```bash
npm run dev
```
This starts the React dev server and opens the app in development mode.

## First Run

When you start the app for the first time:

1. **Grant Permissions**: macOS will ask for camera and microphone permissions
   - Click "OK" to allow access
   - If denied, go to System Preferences → Security & Privacy → Camera/Microphone

2. **Select Your Device**: Choose your webcam from the dropdown menu

3. **Start Recording** or **Take Photos**!

## Features Overview

### Video Recording
- Select "Video" mode
- Choose resolution (up to 4K)
- Enable/disable audio
- Click "Start Recording" → do your thing → "Stop Recording"
- Videos saved to `~/Documents/MacCamera/`

### Photo Capture
- Select "Photo" mode
- Adjust resolution
- Click "Take Photo"
- Photos saved to `~/Documents/MacCamera/`

### Settings
- **Resolution**: 640x480 to 3840x2160 (4K)
- **Frame Rate**: 24, 30, or 60 fps
- **Audio**: Toggle on/off, select microphone

## Troubleshooting

### Camera not showing up?
```bash
# Check if camera is detected
ls /dev/video*  # Linux
system_profiler SPCameraDataType  # macOS
```

### Build errors?
```bash
# Clean and rebuild
rm -rf node_modules renderer/node_modules dist
npm install
npm run build
```

### Want to package as an app?
```bash
# macOS: Creates .dmg installer
./scripts/build-macos.sh

# Linux: Creates .deb package
./scripts/build-linux.sh
```

## Docker Deployment (Linux only)

```bash
# Allow X11 access
xhost +local:docker

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

## File Locations

- **Recordings**: `~/Documents/MacCamera/`
- **Source Code**: [src/main.ts](src/main.ts), [renderer/src/App.tsx](renderer/src/App.tsx)
- **Config**: [package.json](package.json), [forge.config.js](forge.config.js)

## Need Help?

Check the full [README.md](README.md) for detailed documentation.

---

**Ready to record!** Just run `npm start` and your app will open in a new window.
