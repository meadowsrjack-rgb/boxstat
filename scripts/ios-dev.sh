#!/bin/bash

# BoxStat iOS Development Mode
# Uses local bundled assets - no server redeploy needed

set -e

echo "🔧 BoxStat iOS DEV Mode"
echo "======================="
echo ""

# Build frontend
echo "📦 Building frontend..."
npm run build

# Sync to iOS with DEV mode (no remote URL)
echo "📱 Syncing to iOS (dev mode - local bundle)..."
CAPACITOR_MODE=development npx cap sync ios

echo ""
echo "✅ Dev build ready!"
echo ""
echo "📱 Next steps:"
echo "   1. Pull changes on Mac: cd ~/Documents/boxstat && git pull"
echo "   2. In Xcode: Shift+Cmd+K (clean), then Run"
echo ""
echo "💡 The app will load from LOCAL bundle - no redeploy needed!"
echo ""
