#!/bin/bash

# BoxStat Mac Deployment Script
# Run this on your Mac after running the Replit deployment script

set -e  # Exit on any error

echo "🏀 BoxStat Mac Deployment"
echo "========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo -e "${RED}❌ Error: Not in boxstat directory!${NC}"
    echo "Please run: cd ~/Documents/boxstat && ./deploy-to-mac.sh"
    exit 1
fi

# Step 1: Pull latest changes
echo -e "${BLUE}Step 1: Pulling latest code from Replit...${NC}"
git pull origin main

# Step 2: Install dependencies (in case package.json changed)
echo ""
echo -e "${BLUE}Step 2: Checking dependencies...${NC}"
npm install --silent

# Step 3: Build production files
echo ""
echo -e "${BLUE}Step 3: Building production files...${NC}"
npm run build

# Step 4: Sync to iOS
echo ""
echo -e "${BLUE}Step 4: Syncing to iOS with Capacitor...${NC}"
npx cap sync ios

# Step 5: Open Xcode
echo ""
echo -e "${BLUE}Step 5: Opening Xcode...${NC}"
open ios/App/App.xcworkspace

echo ""
echo -e "${GREEN}✅ Deployment to iOS complete!${NC}"
echo ""
echo -e "${YELLOW}📱 Final Steps in Xcode:${NC}"
echo "   1. Select your iPhone as the target device"
echo "   2. Click Run (▶️) to install the app"
echo ""
echo -e "${YELLOW}💡 Pro Tip:${NC}"
echo "   For major changes (like this push notification update):"
echo "   - Press Shift+Cmd+K to clean build"
echo "   - Delete the app from your iPhone first"
echo "   - Then click Run for a fresh install"
echo ""
echo -e "${GREEN}Push notifications will work after this! 🎉${NC}"
