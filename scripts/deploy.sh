#!/bin/bash

# Automated production deployment script for SocialDiscovery
# This script performs zero-downtime deployment using PM2 hot-reload

echo "Starting deployment process..."

# Navigate to project directory
cd /var/www/socialdiscovery || exit 1

# Pull latest changes from main branch
echo "Pulling latest changes from main branch..."
git pull origin main || exit 1

# Install dependencies
echo "Installing dependencies..."
npm ci || exit 1

# Build the application
echo "Building application..."
npm run build || exit 1

# Create logs directory if it doesn't exist
mkdir -p logs

# Reload PM2 with zero downtime
echo "Reloading PM2 with zero downtime..."
pm2 reload ecosystem.config.cjs --update-env || exit 1

echo "Deployment completed successfully!"
