#!/bin/bash

# BoxStat iOS Deployment Script
# This script automates deploying code changes to your iOS app

set -e  # Exit on any error

echo "🏀 BoxStat iOS Deployment Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build on Replit
echo -e "${BLUE}Building production files...${NC}"
npm run build

echo ""
echo -e "${GREEN}✅ Replit build complete!${NC}"
echo ""
echo -e "${YELLOW}📱 Next Step (on your Mac):${NC}"
echo ""
echo "   Run this command:"
echo "   ${GREEN}cd ~/Documents/boxstat && ./deploy-to-mac.sh${NC}"
echo ""
echo "   Then in Xcode, click Run (▶️)"
echo ""
echo -e "${YELLOW}💡 For this first-time push notification deploy:${NC}"
echo "   - Press Shift+Cmd+K in Xcode (clean build)"
echo "   - Delete BoxStat from iPhone"
echo "   - Then Run for fresh install"
echo ""
echo -e "${GREEN}That's it! 🎉${NC}"
