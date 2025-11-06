# MacCamera

A cross-platform webcam recording application for macOS and Linux with support for high-quality video and photo capture.

## Features

- **Cross-Platform**: Works on macOS and Linux
- **High Quality Recording**: Captures video at up to 4K resolution (3840x2160)
- **Flexible Frame Rates**: Support for 24, 30, and 60 fps
- **Audio Support**: Optional audio recording with integrated or external microphones
- **Photo Mode**: Take high-quality snapshots
- **Device Selection**: Choose from multiple cameras and microphones
- **Modern GUI**: Beautiful, responsive interface built with React
- **Container Support**: Can be deployed in Docker containers

## Prerequisites

### For Native Installation

- **Node.js**: v20 or higher
- **npm**: v10 or higher

### For Docker Deployment

- **Docker**: Latest version
- **Docker Compose**: v2.0 or higher (optional)

## Installation

### Native Installation (macOS/Linux)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/maccamera.git
cd maccamera
```

2. Install dependencies:
```bash
npm install
cd renderer && npm install && cd ..
```

3. Build the application:
```bash
npm run build
```

## Usage

### Development Mode

Run the application in development mode:

```bash
npm run dev
```

This will:
- Start the TypeScript compiler in watch mode
- Launch the React development server
- Open the Electron application

### Production Build

#### macOS

```bash
./scripts/build-macos.sh
```

This creates a DMG installer in the `out/` directory.

#### Linux

```bash
./scripts/build-linux.sh
```

This creates a DEB package in the `out/` directory.

### Docker Deployment

#### Build and Run with Docker Compose (Linux only)

1. Allow Docker to access X11 display:
```bash
xhost +local:docker
```

2. Build and run:
```bash
docker-compose up -d
```

3. Access the logs:
```bash
docker-compose logs -f
```

#### Manual Docker Build

```bash
# Build the image
docker build -t maccamera .

# Run the container (Linux)
docker run -it --rm \
  --name maccamera \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
  -v $(pwd)/recordings:/app/recordings \
  --device /dev/video0 \
  --device /dev/snd \
  --privileged \
  maccamera
```

**Note**: Docker deployment works best on Linux. For macOS, native installation is recommended.

## Application Features

### Video Recording

1. Select your camera from the dropdown menu
2. Choose whether to enable audio
3. Select your microphone (if audio is enabled)
4. Choose your desired resolution (VGA to 4K)
5. Set the frame rate (24, 30, or 60 fps)
6. Click "Start Recording" to begin
7. Click "Stop Recording" to finish

Videos are saved in WebM format with high-quality VP9 codec.

### Photo Capture

1. Switch to "Photo" mode
2. Select your camera and settings
3. Click "Take Photo" to capture

Photos are saved in JPEG format at maximum quality.

### Recording Location

All recordings are automatically saved to:
- **macOS**: `~/Documents/MacCamera/`
- **Linux**: `~/Documents/MacCamera/`
- **Docker**: `/app/recordings/` (mounted volume)

Click "Open Recordings Folder" in the app to access your files.

## Quality Settings

### Resolution Options

- **640x480** (VGA) - Basic quality
- **1280x720** (HD) - Standard high definition
- **1920x1080** (Full HD) - Full high definition (recommended)
- **2560x1440** (QHD) - Quad high definition
- **3840x2160** (4K) - Ultra high definition

### Frame Rate Options

- **24 fps** - Cinematic look
- **30 fps** - Standard video (recommended)
- **60 fps** - Smooth motion

### Video Codec

The application uses WebM container with VP9 video codec at 10 Mbps bitrate for high-quality recordings. If VP9 is not supported by your system, it falls back to VP8 or standard WebM.

### Audio Quality

- Echo cancellation enabled
- Noise suppression enabled
- Automatic gain control enabled

## Project Structure

```
maccamera/
├── src/                    # Electron main process
│   ├── main.ts            # Main process entry point
│   └── preload.ts         # Preload script for IPC
├── renderer/              # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── App.css        # Styles
│   │   └── index.tsx      # React entry point
│   └── public/            # Static assets
├── scripts/               # Build scripts
│   ├── build-macos.sh     # macOS build script
│   └── build-linux.sh     # Linux build script
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
├── forge.config.js        # Electron Forge configuration
└── package.json           # Project dependencies
```

## Troubleshooting

### Camera Not Detected

- **macOS**: Grant camera permissions in System Preferences > Security & Privacy > Camera
- **Linux**: Ensure your user is in the `video` group: `sudo usermod -a -G video $USER`
- Check that no other application is using the camera

### No Audio

- **macOS**: Grant microphone permissions in System Preferences > Security & Privacy > Microphone
- **Linux**: Install `pulseaudio` or ensure ALSA is properly configured
- Check that the correct microphone is selected in the app

### Docker Issues (Linux)

- Run `xhost +local:docker` to allow Docker to access your display
- Ensure `/dev/video0` exists: `ls -l /dev/video*`
- Check container logs: `docker-compose logs -f`

### High CPU Usage

- Lower the resolution setting
- Reduce the frame rate
- Disable audio if not needed

## Development

### Tech Stack

- **Electron**: Cross-platform desktop framework
- **React**: Frontend UI library
- **TypeScript**: Type-safe JavaScript
- **MediaRecorder API**: Browser-native recording
- **FFmpeg**: Media processing (via ffmpeg-static)

### Building from Source

1. Fork the repository
2. Make your changes
3. Test on both macOS and Linux
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the GitHub issue tracker.
