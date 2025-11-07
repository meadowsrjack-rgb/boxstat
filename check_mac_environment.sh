#!/bin/bash

# UYP Basketball App - Mac Environment Setup & Verification Script
# This script checks your Mac environment and fixes common iOS deployment issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}UYP Basketball App - Mac Setup Checker${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Track if we need to fix anything
NEEDS_FIXES=false

# 1. Check and fix UTF-8 encoding
echo -e "${YELLOW}[1/7] Checking UTF-8 encoding...${NC}"
if [[ "$LANG" != *"UTF-8"* ]]; then
    echo -e "${RED}✗ UTF-8 encoding not set${NC}"
    echo -e "${GREEN}Fixing: Adding UTF-8 to ~/.zshrc${NC}"
    echo '' >> ~/.zshrc
    echo '# UTF-8 encoding for CocoaPods' >> ~/.zshrc
    echo 'export LANG=en_US.UTF-8' >> ~/.zshrc
    echo 'export LC_ALL=en_US.UTF-8' >> ~/.zshrc
    source ~/.zshrc
    echo -e "${GREEN}✓ Fixed! Please run 'source ~/.zshrc' in your terminal${NC}"
    NEEDS_FIXES=true
else
    echo -e "${GREEN}✓ UTF-8 encoding is set${NC}"
fi

# 2. Check Xcode
echo -e "\n${YELLOW}[2/7] Checking Xcode installation...${NC}"
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}✗ Xcode is not installed${NC}"
    echo -e "${YELLOW}Please install Xcode from the App Store, then run this script again${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Xcode is installed${NC}"
    xcodebuild -version
fi

# 3. Check and fix xcode-select path
echo -e "\n${YELLOW}[3/7] Checking xcode-select path...${NC}"
XCODE_PATH=$(xcode-select -p)
if [[ "$XCODE_PATH" == *"CommandLineTools"* ]]; then
    echo -e "${RED}✗ xcode-select points to Command Line Tools, not Xcode${NC}"
    echo -e "${GREEN}Fixing: Switching to Xcode...${NC}"
    sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
    echo -e "${GREEN}✓ Fixed! xcode-select now points to Xcode${NC}"
    NEEDS_FIXES=true
else
    echo -e "${GREEN}✓ xcode-select points to Xcode${NC}"
fi

# 4. Accept Xcode license
echo -e "\n${YELLOW}[4/7] Checking Xcode license...${NC}"
if ! sudo xcodebuild -license check &> /dev/null; then
    echo -e "${RED}✗ Xcode license not accepted${NC}"
    echo -e "${GREEN}Please accept the Xcode license:${NC}"
    sudo xcodebuild -license accept
else
    echo -e "${GREEN}✓ Xcode license accepted${NC}"
fi

# 5. Check Node.js
echo -e "\n${YELLOW}[5/7] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo -e "${YELLOW}Install Node.js from https://nodejs.org or use Homebrew:${NC}"
    echo -e "  brew install node"
    exit 1
else
    echo -e "${GREEN}✓ Node.js is installed${NC}"
    node --version
    npm --version
fi

# 6. Check Ruby
echo -e "\n${YELLOW}[6/7] Checking Ruby...${NC}"
if ! command -v ruby &> /dev/null; then
    echo -e "${RED}✗ Ruby is not installed${NC}"
    echo -e "${YELLOW}Ruby should come with macOS. Something is wrong.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Ruby is installed${NC}"
    ruby --version
fi

# 7. Check and install CocoaPods
echo -e "\n${YELLOW}[7/7] Checking CocoaPods...${NC}"
if ! command -v pod &> /dev/null; then
    echo -e "${RED}✗ CocoaPods is not installed${NC}"
    echo -e "${GREEN}Installing CocoaPods...${NC}"
    sudo gem install cocoapods
    echo -e "${GREEN}✓ CocoaPods installed!${NC}"
    NEEDS_FIXES=true
else
    echo -e "${GREEN}✓ CocoaPods is installed${NC}"
    pod --version
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Environment Check Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

if [ "$NEEDS_FIXES" = true ]; then
    echo -e "${YELLOW}Some fixes were applied. Please:${NC}"
    echo -e "1. Close and reopen your terminal (or run: source ~/.zshrc)"
    echo -e "2. Run this script again to verify all checks pass"
else
    echo -e "${GREEN}✓ All checks passed! Your Mac is ready for iOS development.${NC}"
    echo -e "\nNext steps:"
    echo -e "1. Clone your project from GitHub (if not already done)"
    echo -e "2. Follow the QUICK_START_IOS.md guide to build your app"
fi
