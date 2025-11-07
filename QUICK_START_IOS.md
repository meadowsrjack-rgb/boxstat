# Quick Start: iOS Deployment Checklist

This is a condensed, step-by-step checklist for deploying your UYP Basketball app to iOS. If you encounter any errors, refer to [MAC_SETUP_GUIDE.md](./MAC_SETUP_GUIDE.md) for detailed troubleshooting.

---

## ✅ Pre-Flight Checklist

Before you start, make sure you have:
- [ ] Mac running macOS 12 or later
- [ ] Admin access to your Mac
- [ ] Apple ID
- [ ] 20GB+ free disk space

---

## 🚀 Setup Steps (First Time Only)

### 1. Install Xcode
```bash
# Open App Store → Search "Xcode" → Install
# Then verify:
xcodebuild -version
```

### 2. Install Node.js
```bash
# Option A: Homebrew
brew install node

# Option B: Download from https://nodejs.org

# Verify:
node --version
npm --version
```

### 3. Run Environment Check Script
```bash
cd ~/Downloads  # Or wherever you saved check_mac_environment.sh
chmod +x check_mac_environment.sh
./check_mac_environment.sh
```

**✓ All checks should pass.** If not, follow the script's instructions, restart Terminal, and run again.

---

## 📦 Build Your iOS App (Every Time)

### 4. Clone Project (First Time) or Update (Subsequent Times)
```bash
# First time:
cd ~/Documents
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Subsequent times:
cd ~/Documents/your-repo
git pull origin main  # Get latest changes
```

### 5. Install Dependencies
```bash
# From project root:
npm install
```
**✓ Checkpoint:** You should see a `node_modules` folder created.

### 6. Build Web App
```bash
# From project root:
npm run build
```
**✓ Checkpoint:** You should see a `public` folder with built files.

### 7. Sync to iOS
```bash
# From project root:
npx cap sync ios
```
**✓ Checkpoint:** You should see "Sync finished" message.

### 8. Install CocoaPods Dependencies
```bash
# Navigate to iOS app folder:
cd ios/App

# Install pods:
pod install
```
**✓ Checkpoint:** You should see "Pod installation complete!"

### 9. Open in Xcode
```bash
# From ios/App folder:
open App.xcworkspace
```
**⚠️ IMPORTANT:** Open `App.xcworkspace` (white icon), NOT `App.xcodeproj` (blue icon)!

---

## 🎯 Run in Simulator

### 10. Configure Signing
1. Click **App** in left sidebar (blue icon)
2. Select **App** target
3. Go to **Signing & Capabilities** tab
4. ✓ Check **Automatically manage signing**
5. Select your **Team** (Apple ID)

### 11. Select Simulator
1. At top of Xcode, click device dropdown
2. Select **iPhone 15 Pro** (or any iPhone simulator)
3. If simulators are grayed out:
   - Click **App** project → **App** target → **General** tab
   - Under **Supported Destinations**, uncheck and re-check **iPhone**

### 12. Build & Run
1. Click ▶️ Play button (or press **Cmd+R**)
2. Wait for build to complete
3. Simulator launches with your app!

**✓ Success!** Your app is running on iOS simulator.

---

## 🔄 Making Changes & Testing

When you make code changes on Replit:

```bash
cd ~/Documents/your-repo
git pull                 # Get latest changes
npm install              # Update dependencies (if package.json changed)
npm run build            # Rebuild web app
npx cap sync ios         # Sync to iOS
cd ios/App
pod install              # Update pods (if dependencies changed)
open App.xcworkspace     # Open in Xcode
```

Then press **Cmd+R** in Xcode to rebuild and run.

---

## 🚨 Common Errors & Quick Fixes

### Error: "cannot load such file -- pods_helpers"
**Cause:** `node_modules` folder missing  
**Fix:**
```bash
cd ~/Documents/your-repo  # Go to PROJECT ROOT
npm install               # Creates node_modules
cd ios/App
pod install
```

### Error: "Unicode Normalization not appropriate for ASCII-8BIT"
**Cause:** Terminal encoding issue  
**Fix:**
```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
source ~/.zshrc
cd ios/App
pod install
```

### Error: "xcodebuild requires Xcode"
**Cause:** xcode-select pointing to wrong location  
**Fix:**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
cd ios/App
pod install
```

### Error: Simulators grayed out in Xcode
**Fix:**
1. **App** project → **App** target → **General**
2. **Supported Destinations** → Uncheck and re-check **iPhone**
3. Or: Window → Devices and Simulators → Select simulator → Set to "Always"

### Error: Build fails with missing modules
**Fix:**
```bash
cd ~/Documents/your-repo
rm -rf node_modules ios
npm install
npm run build
npx cap add ios
npx cap sync ios
cd ios/App
pod install
open App.xcworkspace
```

---

## 📱 Next: Deploy to App Store

Once your app runs successfully in simulator, follow:
1. [XCODE_DEPLOYMENT_GUIDE.md](./XCODE_DEPLOYMENT_GUIDE.md) - Complete App Store submission guide
2. Sign up for Apple Developer Program ($99/year)
3. Create App Store listing
4. Submit for review

---

## 🎉 Alternative: PWA (No Mac Required!)

Your app is **already a Progressive Web App** and works on iOS right now:

1. Open Safari on iPhone/iPad
2. Go to your app's URL (e.g., `https://your-replit-url.replit.app`)
3. Tap the **Share** button
4. Tap **Add to Home Screen**
5. Your app installs like a native app!

**PWA Benefits:**
- ✓ No Mac or Xcode required
- ✓ No App Store approval needed
- ✓ Updates instantly (no app store review)
- ✓ Works offline
- ✓ Push notifications (via web push)

**PWA Limitations:**
- ✗ Not discoverable in App Store
- ✗ Users must know your URL
- ✗ Some iOS features limited

---

## 📞 Need Help?

1. ✓ Run `check_mac_environment.sh` and ensure all checks pass
2. ✓ Verify you're in the correct directory for each command
3. ✓ Check [MAC_SETUP_GUIDE.md](./MAC_SETUP_GUIDE.md) for detailed troubleshooting
4. ✓ Review [Capacitor iOS Docs](https://capacitorjs.com/docs/ios/troubleshooting)
