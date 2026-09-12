#!/bin/bash
# Direct Node execution script for SocialDiscovery
# This script runs the server without npm for more stable production deployment

echo "Starting SocialDiscovery server..."
echo "Loading environment variables..."

# Set production environment
export NODE_ENV=production
export PORT=5173

# Run the server directly with Node
node server-entry.js
