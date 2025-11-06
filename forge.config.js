module.exports = {
  packagerConfig: {
    name: 'MacCamera',
    executableName: 'maccamera',
    icon: './assets/icon',
    asar: true,
    extraResource: [
      './node_modules/ffmpeg-static'
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'MacCamera',
        icon: './assets/icon.icns',
        format: 'ULFO'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'maccamera',
          productName: 'MacCamera',
          genericName: 'Webcam Recorder',
          description: 'Cross-platform webcam recording application',
          categories: ['AudioVideo', 'Recorder'],
          icon: './assets/icon.png',
          maintainer: 'MacCamera Team',
          homepage: 'https://github.com/yourusername/maccamera'
        }
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
