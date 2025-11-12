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
echo -e "${BLUE}Step 1: Building production files...${NC}"
npm run build

# Step 2: Commit and push changes
echo ""
echo -e "${BLUE}Step 2: Committing changes to git...${NC}"
git add -A
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
git commit -m "Deploy: $TIMESTAMP" || echo "No changes to commit"
git push origin main || echo "Push failed - continuing anyway"

echo ""
echo -e "${GREEN}✅ Replit build complete!${NC}"
echo ""
echo -e "${YELLOW}📱 Next Steps (on your Mac):${NC}"
echo "   1. Open Terminal and run:"
echo "      cd ~/Documents/boxstat && ./deploy-to-mac.sh"
echo ""
echo "   2. In Xcode:"
echo "      - Delete BoxStat app from iPhone (if major changes)"
echo "      - Click Run (▶️) to install fresh build"
echo ""
echo -e "${GREEN}That's it! 🎉${NC}"
