#!/bin/bash

# Build script for Linux
set -e

echo "Building MacCamera for Linux..."

# Install dependencies
echo "Installing dependencies..."
npm install
cd renderer && npm install && cd ..

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Package application
echo "Packaging application..."
npm run package

echo "Build complete! Check the 'out' directory for the package."
