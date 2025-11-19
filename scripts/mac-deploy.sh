#!/bin/bash

# BoxStat iOS Deployment Script for Mac
# This script force-syncs your Mac with Replit and deploys to iOS

set -e

echo "🏀 BoxStat iOS Deployment"
echo "========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in BoxStat directory"
    echo "Run: cd ~/Documents/boxstat && ./mac-deploy.sh"
    exit 1
fi

echo "Step 1: Force-syncing with Replit..."
git fetch origin main
git reset --hard origin/main
git clean -fd
echo "✅ Synced with Replit"
echo ""

echo "Step 2: Building production files..."
npm run build
echo "✅ Build complete"
echo ""

echo "Step 3: Syncing to iOS..."
npx cap sync ios
echo "✅ iOS sync complete"
echo ""

echo "Step 4: Opening Xcode..."
npx cap open ios
echo ""

echo "✅ Deployment ready!"
echo ""
echo "📱 Next steps in Xcode:"
echo "  1. Select your iPhone as target"
echo "  2. Click Run (▶️) to install"
echo ""
echo "🔄 For major updates (like Firebase):"
echo "  1. Press Shift+Cmd+K to clean build"
echo "  2. Delete BoxStat from your iPhone"
echo "  3. Click Run (▶️) for fresh install"
