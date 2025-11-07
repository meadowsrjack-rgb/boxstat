# Mac Environment Setup for iOS Deployment

This guide will help you set up your Mac from scratch to deploy the UYP Basketball app to iOS. Follow these steps **in order**.

---

## Prerequisites

You need:
- A Mac running macOS 12 or later
- An Apple ID
- At least 20GB of free disk space
- Admin access to your Mac

---

## Step 1: Install Xcode

1. Open the **App Store** on your Mac
2. Search for **"Xcode"**
3. Click **Get** or **Install** (it's free, but large ~15GB)
4. Wait for the download and installation to complete (this can take 30-60 minutes)

**Verify:**
```bash
xcodebuild -version
```
You should see something like: `Xcode 15.x` and `Build version xxxxx`

---

## Step 2: Install Homebrew (Optional but Recommended)

Homebrew makes installing development tools easier.

1. Open **Terminal** (found in Applications → Utilities)
2. Paste this command and press Enter:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Follow the on-screen instructions
4. Add Homebrew to your PATH (the installer will tell you the exact command)

**Verify:**
```bash
brew --version
```

---

## Step 3: Install Node.js

**Option A: Using Homebrew (recommended)**
```bash
brew install node
```

**Option B: Download from nodejs.org**
1. Visit https://nodejs.org
2. Download the **LTS** version (left button)
3. Run the installer and follow the steps

**Verify:**
```bash
node --version
npm --version
```
Both commands should show version numbers.

---

## Step 4: Run the Automated Environment Setup Script

This script will check your Mac environment and fix common issues automatically.

1. Download the `check_mac_environment.sh` script from your project (it's in the root folder)
2. Open Terminal and navigate to where you saved the script:
   ```bash
   cd ~/Downloads  # Or wherever you saved it
   ```
3. Make the script executable:
   ```bash
   chmod +x check_mac_environment.sh
   ```
4. Run the script:
   ```bash
   ./check_mac_environment.sh
   ```

The script will:
- ✓ Check and fix UTF-8 encoding
- ✓ Verify Xcode installation
- ✓ Fix xcode-select path issues
- ✓ Accept Xcode license
- ✓ Verify Node.js installation
- ✓ Check Ruby installation
- ✓ Install CocoaPods if missing

**If the script finds issues:**
- Follow the on-screen instructions
- Close and reopen Terminal
- Run the script again until all checks pass

---

## Step 5: Clone Your Project from GitHub

1. **Find your repository URL:**
   - Go to your GitHub repository
   - Click the green **Code** button
   - Copy the HTTPS URL (looks like: `https://github.com/yourusername/your-repo.git`)

2. **Clone the repository:**
   ```bash
   cd ~/Documents  # Or wherever you want to store the project
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo  # Replace with your actual repo name
   ```

---

## Step 6: Install Project Dependencies

From inside your project folder:

```bash
# Install Node.js dependencies
npm install

# Build the web app
npm run build
```

**This is crucial!** The `npm install` command creates the `node_modules` folder that CocoaPods needs.

---

## Step 7: Sync Capacitor iOS Platform

```bash
# Sync the web app to iOS
npx cap sync ios
```

This command:
- Copies your built web app to the iOS folder
- Updates iOS configuration
- Prepares the iOS project

---

## Step 8: Install iOS Dependencies with CocoaPods

```bash
# Navigate to the iOS app folder
cd ios/App

# Install CocoaPods dependencies
pod install
```

**Expected output:** You should see "Pod installation complete!"

**Common errors and fixes:**

### Error: "cannot load such file -- pods_helpers"
This means `node_modules` is missing. Go back to Step 6 and run `npm install` from the **project root** (not from `ios/App`).

### Error: "Unicode Normalization not appropriate for ASCII-8BIT"
Your terminal encoding is wrong. Run:
```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
source ~/.zshrc
```
Then try `pod install` again.

### Error: "xcodebuild requires Xcode"
Run:
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```
Then try `pod install` again.

---

## Step 9: Open the Project in Xcode

**IMPORTANT:** Always open the `.xcworkspace` file, **NOT** the `.xcodeproj` file!

```bash
# From the ios/App folder
open App.xcworkspace
```

Or:
1. Open Xcode
2. File → Open
3. Navigate to `your-project/ios/App/`
4. Select `App.xcworkspace` (the one with the white icon)
5. Click Open

---

## Step 10: Configure Signing & Run

1. In Xcode, click on **App** in the left sidebar (blue icon)
2. Select the **App** target (not the project)
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (your Apple ID)
6. Xcode will automatically create a provisioning profile

**To run on simulator:**
1. At the top of Xcode, click the device dropdown (next to "App")
2. Select any iPhone simulator (e.g., "iPhone 15 Pro")
3. Click the **Play** button (▶️) or press Cmd+R
4. The simulator will launch with your app!

---

## Troubleshooting

### Simulators are grayed out or not showing

**Solution 1: Check Supported Destinations**
1. Click **App** in the left sidebar
2. Select the **App** target
3. Go to **General** tab
4. Under **Supported Destinations**, make sure **iPhone** is checked
5. If it's already checked, uncheck and re-check it

**Solution 2: Show simulators as "Always"**
1. Window → Devices and Simulators
2. Click **Simulators** tab
3. Select a simulator
4. Change "Show run destination" to **Always**

**Solution 3: Install iOS runtime**
1. Xcode → Settings → Platforms
2. Click **+** to download iOS 17 simulator runtime

### Build errors about missing modules

**Solution:**
```bash
cd ~/path/to/your-project
npm install
npm run build
npx cap sync ios
cd ios/App
pod install --repo-update
```

### "Command not found" errors

Make sure you're running commands from the correct directory:
- `npm install`, `npm run build`, `npx cap sync ios` → Run from **project root**
- `pod install` → Run from **ios/App** folder

---

## Next Steps

Once your app runs successfully in the simulator:
1. Follow the [XCODE_DEPLOYMENT_GUIDE.md](./XCODE_DEPLOYMENT_GUIDE.md) for App Store submission
2. Set up an Apple Developer account ($99/year)
3. Configure code signing for distribution
4. Create app screenshots and metadata
5. Submit for App Review

---

## Quick Reference Commands

From **project root**:
```bash
npm install           # Install dependencies
npm run build         # Build web app
npx cap sync ios      # Sync to iOS
```

From **ios/App** folder:
```bash
pod install           # Install iOS dependencies
open App.xcworkspace  # Open in Xcode
```

---

## Still Having Issues?

1. Make sure you ran the `check_mac_environment.sh` script and all checks passed
2. Verify you're using the correct directories for each command
3. Try cleaning and rebuilding:
   ```bash
   cd ~/path/to/your-project
   rm -rf node_modules ios
   npm install
   npm run build
   npx cap add ios
   npx cap sync ios
   cd ios/App
   pod install
   ```
4. Check the [Capacitor iOS Troubleshooting Guide](https://capacitorjs.com/docs/ios/troubleshooting)
