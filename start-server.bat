@echo off
REM Direct Node execution script for SocialDiscovery
REM This script runs the server without npm for more stable production deployment

echo Starting SocialDiscovery server...
echo Loading environment variables...

REM Set production environment
set NODE_ENV=production
set PORT=5173

REM Run the server directly with Node
node server-entry.js
