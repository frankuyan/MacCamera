#!/bin/sh

# Start Xvfb for virtual display if needed
if [ ! -z "$USE_XVFB" ]; then
    Xvfb :99 -screen 0 1920x1080x24 &
    sleep 2
fi

# Start the Electron app
exec npm start
