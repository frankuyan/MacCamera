const { app, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');

/**
 * Uses Electron to render SVG and capture as PNG
 */

let window;

async function createIconFromSVG(svgPath, outputPath, size) {
  return new Promise(async (resolve, reject) => {
    try {
      const svgContent = await fs.readFile(svgPath, 'utf8');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: transparent; }
            #svg-container { width: ${size}px; height: ${size}px; }
          </style>
        </head>
        <body>
          <div id="svg-container">${svgContent}</div>
        </body>
        </html>
      `;

      window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      window.webContents.on('did-finish-load', async () => {
        // Wait a bit for rendering
        setTimeout(async () => {
          try {
            const image = await window.webContents.capturePage({
              x: 0,
              y: 0,
              width: size,
              height: size
            });

            const png = image.toPNG();
            await fs.writeFile(outputPath, png);
            console.log(`✓ Created: ${path.basename(outputPath)} (${size}x${size})`);
            resolve();
          } catch (err) {
            reject(err);
          }
        }, 500);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function generateAllIcons() {
  const svgPath = path.join(__dirname, '../assets/logo.svg');
  const assetsDir = path.join(__dirname, '../assets');
  const publicDir = path.join(__dirname, '../renderer/public');

  // Create 512x512 PNG for Linux
  await createIconFromSVG(svgPath, path.join(assetsDir, 'icon.png'), 512);

  // Create smaller sizes for favicon
  await createIconFromSVG(svgPath, path.join(publicDir, 'favicon-16x16.png'), 16);
  await createIconFromSVG(svgPath, path.join(publicDir, 'favicon-32x32.png'), 32);
  await createIconFromSVG(svgPath, path.join(publicDir, 'favicon-192x192.png'), 192);
  await createIconFromSVG(svgPath, path.join(publicDir, 'apple-touch-icon.png'), 180);

  console.log('\n✓ All icons generated successfully!');
  console.log('\nNote: For macOS .icns file, use:');
  console.log('  png2icns icon.icns icon.png');
  console.log('  or use online converter at cloudconvert.com\n');

  app.quit();
}

app.whenReady().then(async () => {
  window = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    webPreferences: {
      offscreen: true
    }
  });

  try {
    await generateAllIcons();
  } catch (err) {
    console.error('Error generating icons:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});
