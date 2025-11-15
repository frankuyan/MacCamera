# MacCamera Design Assets & Branding Guide

## Overview

This document describes the MacCamera logo, branding materials, and instructions for generating production-ready assets.

## Brand Identity

### Color Palette

**Primary Colors:**
- Purple Gradient: `#667eea` → `#764ba2`
- Used in: App header, logo, primary buttons

**Accent Colors:**
- Recording Red: `#ff4444` (recording indicator)
- Cyan: `#4facfe` → `#00f2fe` (photo mode)
- Pink/Red: `#f093fb` → `#f5576c` (stop button)

**UI Colors:**
- Background: `#1a1a1a` (dark)
- Panel: `#2a2a2a` (medium dark)
- Text: `#ffffff` (white)
- Borders: `#444444`

### Logo Design

The MacCamera logo features:
- **Camera body** with rounded corners in purple gradient
- **Lens** in center with layered circles
- **Recording indicator** (red dot) in top-right
- **Viewfinder** element on the left side

The design is:
- Modern and minimal
- Recognizable at small sizes
- Works in both light and dark contexts
- Reflects the app's purpose (camera recording)

## Current Assets

### SVG Files (Source)

All source logos are in SVG format for scalability:

```
/assets/logo.svg           - Full 512x512 logo (main source)
/assets/icon.svg           - App icon (copy of logo.svg)
/renderer/public/logo.svg  - Frontend logo
/renderer/public/favicon.svg - Simplified 32x32 favicon
```

### Frontend Integration

The logo is integrated into the app header:
- Located at: `renderer/src/App.tsx` (line 274)
- Size: 60x60px with drop shadow
- Animation: Subtle floating effect (3s cycle)
- Position: Left of app title

## Generating Production Assets

### Required Formats

For production builds, you need:

| Format | Size | Purpose |
|--------|------|---------|
| PNG | 512x512 | Linux DEB package (`assets/icon.png`) |
| ICNS | 1024x1024 | macOS DMG installer (`assets/icon.icns`) |
| ICO | 256x256 | Windows (optional fallback) |

### Method 1: Using Inkscape (Recommended)

**Install Inkscape:**
```bash
# macOS
brew install inkscape

# Ubuntu/Debian
sudo apt-get install inkscape

# Windows
choco install inkscape
```

**Generate PNG:**
```bash
cd /home/user/MacCamera/assets
inkscape -w 512 -h 512 logo.svg -o icon.png
inkscape -w 1024 -h 1024 logo.svg -o icon-1024.png
```

**Generate ICNS (macOS):**
```bash
# Create iconset directory
mkdir icon.iconset

# Generate all required sizes
inkscape -w 16 -h 16 logo.svg -o icon.iconset/icon_16x16.png
inkscape -w 32 -h 32 logo.svg -o icon.iconset/icon_16x16@2x.png
inkscape -w 32 -h 32 logo.svg -o icon.iconset/icon_32x32.png
inkscape -w 64 -h 64 logo.svg -o icon.iconset/icon_32x32@2x.png
inkscape -w 128 -h 128 logo.svg -o icon.iconset/icon_128x128.png
inkscape -w 256 -h 256 logo.svg -o icon.iconset/icon_128x128@2x.png
inkscape -w 256 -h 256 logo.svg -o icon.iconset/icon_256x256.png
inkscape -w 512 -h 512 logo.svg -o icon.iconset/icon_256x256@2x.png
inkscape -w 512 -h 512 logo.svg -o icon.iconset/icon_512x512.png
inkscape -w 1024 -h 1024 logo.svg -o icon.iconset/icon_512x512@2x.png

# Convert to ICNS
iconutil -c icns icon.iconset

# Clean up
rm -rf icon.iconset
```

### Method 2: Using ImageMagick

**Install ImageMagick:**
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows
choco install imagemagick
```

**Generate PNG:**
```bash
cd /home/user/MacCamera/assets
convert -background none -size 512x512 logo.svg icon.png
convert -background none -size 1024x1024 logo.svg icon-1024.png
```

### Method 3: Using Online Converters

For quick conversions without installing tools:

**SVG to PNG:**
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Convertio](https://convertio.co/svg-png/)

**PNG to ICNS:**
- [CloudConvert](https://cloudconvert.com/png-to-icns)
- [iConvert Icons](https://iconverticons.com/online/)

**Steps:**
1. Upload `assets/logo.svg`
2. Select output format (PNG at 512x512, or ICNS)
3. Download and save to `assets/icon.png` or `assets/icon.icns`

### Method 4: Using npm Scripts (Automated)

Add to `package.json` scripts:
```json
{
  "scripts": {
    "generate-icons": "inkscape -w 512 -h 512 assets/logo.svg -o assets/icon.png"
  }
}
```

Then run:
```bash
npm run generate-icons
```

## Favicon Generation

The web app uses SVG favicons (modern browser support). For legacy support, generate ICO:

```bash
# Using ImageMagick
convert renderer/public/favicon.svg -define icon:auto-resize=16,32,48,64 renderer/public/favicon.ico
```

## Verification

After generating assets, verify:

1. **File existence:**
   ```bash
   ls -lh assets/icon.png
   ls -lh assets/icon.icns  # macOS only
   ```

2. **File sizes:**
   - PNG should be ~100-200KB
   - ICNS should be ~200-400KB

3. **Build test:**
   ```bash
   npm run make
   ```

## Logo Usage Guidelines

### Do's ✓
- Use the purple gradient colors for brand consistency
- Maintain aspect ratio (always square)
- Ensure adequate padding around the logo
- Use on dark or light backgrounds (logo has built-in contrast)

### Don'ts ✗
- Don't stretch or distort the logo
- Don't change the color scheme
- Don't add effects (logo already has shadows/gradients)
- Don't place on busy backgrounds

## Design Files

### Source Files
- Main logo: `assets/logo.svg`
- Simplified favicon: `renderer/public/favicon.svg`

### Editable Software
SVG files can be edited with:
- [Figma](https://figma.com) (web-based)
- [Adobe Illustrator](https://adobe.com/illustrator)
- [Inkscape](https://inkscape.org) (free, open-source)
- [Sketch](https://sketch.com) (macOS)

### Design Specifications

**Logo Dimensions:**
- Original: 512x512px
- Header: 60x60px
- Favicon: 32x32px

**Visual Elements:**
- Camera body: Rectangle with 32px border radius
- Lens: Concentric circles (112px, 104px, 88px, 72px, 56px)
- Recording dot: 32px circle at (392, 200)
- Viewfinder: 48x32px rectangle at (96, 192)

## Support

For questions about the design assets:
1. Review this documentation
2. Check the SVG source files for dimensions/colors
3. Refer to `renderer/src/App.css` for frontend styling
4. See `forge.config.js` for icon references in builds

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Maintainer:** MacCamera Team
