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

echo ""
echo -e "${GREEN}✅ Replit build complete!${NC}"
echo ""

# Step 2: Commit and push
echo -e "${BLUE}Step 2: Pushing changes to git...${NC}"
git add -A
git commit -m "Deploy to iOS $(date +'%Y-%m-%d %H:%M')" || echo "No changes to commit"
git push origin main

echo ""
echo -e "${GREEN}✅ Changes pushed to repository!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}📱 Next Step: Run this on your Mac Terminal${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "cd ~/Documents/boxstat && git fetch origin && git reset --hard origin/main && git clean -fd && npm run build && npx cap sync ios && npx cap open ios"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}💡 For Firebase push notification updates:${NC}"
echo "   1. In Xcode: Shift+Cmd+K (clean build)"
echo "   2. Delete BoxStat app from iPhone"
echo "   3. Click Run (▶️) for fresh install"
echo ""
echo -e "${GREEN}That's it! 🎉${NC}"
