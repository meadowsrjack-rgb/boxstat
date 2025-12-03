#!/bin/bash

# BoxStat iOS Production Mode  
# Uses remote URL (boxstat.app) - requires redeploy for web changes

set -e

echo "🚀 BoxStat iOS PRODUCTION Mode"
echo "=============================="
echo ""

# Build frontend
echo "📦 Building frontend..."
npm run build

# Sync to iOS with PRODUCTION mode (loads from boxstat.app)
echo "📱 Syncing to iOS (production mode - remote URL)..."
CAPACITOR_MODE=production npx cap sync ios

echo ""
echo "✅ Production build ready!"
echo ""
echo "📱 Next steps:"
echo "   1. Pull changes on Mac: cd ~/Documents/boxstat && git pull"  
echo "   2. In Xcode: Shift+Cmd+K (clean), then Run"
echo ""
echo "⚠️  The app loads from boxstat.app - redeploy needed for web changes"
echo ""
