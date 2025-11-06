#!/bin/bash

# Build script for macOS
set -e

echo "Building MacCamera for macOS..."

# Install dependencies
echo "Installing dependencies..."
npm install
cd renderer && npm install && cd ..

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Create DMG
echo "Creating DMG..."
npm run make

echo "Build complete! Check the 'out' directory for the DMG."
