# BoxStat - Xcode/Native iOS Deployment Guide

This guide will help you export the BoxStat app and deploy it to the Apple App Store using Xcode.

---

## ⚠️ First Time Setup?

**If this is your first time setting up your Mac for iOS development**, start here:

1. **[MAC_SETUP_GUIDE.md](./MAC_SETUP_GUIDE.md)** - Complete Mac environment setup from scratch
2. **[QUICK_START_IOS.md](./QUICK_START_IOS.md)** - Quick reference checklist with troubleshooting

These guides cover:
- Installing Xcode, Node.js, CocoaPods
- Running automated environment checks
- Fixing common errors (UTF-8, xcode-select, Podfile paths)
- Opening your project in Xcode for the first time

**Once your environment is set up and you can run the app in Xcode simulator**, return to this guide for App Store submission.

---

## Prerequisites

### Required Tools
- **macOS computer** (Xcode only runs on Mac)
- **Xcode 15+** (Download from Mac App Store)
- **Apple Developer Account** ($99/year for App Store distribution)
- **CocoaPods** (iOS dependency manager)
- **Node.js 18+** and **npm**

### Environment Setup
If you haven't already, run the automated environment checker:
```bash
./check_mac_environment.sh
```

All checks should pass before proceeding.

## Step 1: Build the Web App

On Replit, build your production app:

```bash
npm run build
```

This creates the `dist/public` folder with your compiled web app.

## Step 2: Sync Capacitor

After building, sync your web app to the iOS platform:

```bash
npx cap sync ios
```

This command:
- Copies the web app from `dist/public` to `ios/App/App/public`
- Updates native dependencies
- Ensures iOS project has latest web code

## Step 3: Download the iOS Project

You need to download the entire `ios/` folder to your Mac:

1. In Replit, navigate to the `ios/` folder
2. Right-click and select "Download"
3. Extract the downloaded zip on your Mac

**Alternatively**, if you have the project in a Git repository:
```bash
git clone your-repo-url
cd your-project
npm install
npm run build
npx cap sync ios
```

## Step 4: Install iOS Dependencies

On your Mac, navigate to the iOS project folder:

```bash
cd ios/App
pod install
```

This installs all iOS native dependencies (CocoaPods).

## Step 5: Open Project in Xcode

Open the **workspace** file (not the project file):

```bash
open App.xcworkspace
```

**Important**: Always use `App.xcworkspace`, never `App.xcodeproj`

## Step 6: Configure App Settings in Xcode

### A. Update Bundle Identifier
1. Select the **App** target in the project navigator
2. Go to **General** tab
3. Change **Bundle Identifier** to: `com.boxstat.app`
4. Ensure it matches `appId` in `capacitor.config.ts`

### B. Set Version and Build Number
1. In **General** tab
2. Set **Version** (e.g., `1.0.0`)
3. Set **Build** (e.g., `1`)

### C. Configure Signing
1. Go to **Signing & Capabilities** tab
2. Check **Automatically manage signing**
3. Select your **Team** (Apple Developer account)
4. Xcode will automatically generate provisioning profiles

### D. Set Deployment Target
1. In **General** tab
2. Set **iOS Deployment Target** to `13.0` or higher
3. This determines minimum iOS version supported

### E. Enable Push Notifications Capability
**Required for event alerts and notifications**

1. Go to **Signing & Capabilities** tab
2. Click **+ Capability** button
3. Search for and add **Push Notifications**
4. Ensure it's enabled (checkbox checked)

### F. Configure APNs (Apple Push Notification Service)
**Required for push notifications to work**

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Keys** from the sidebar
4. Click **+** to create a new key
5. Name it "BoxStat APNs Key"
6. Check **Apple Push Notifications service (APNs)**
7. Click **Continue** → **Register**
8. Download the `.p8` key file (save it securely!)
9. Note the **Key ID** (you'll need this)

**Verify APNs is Enabled on App ID:**
1. In Apple Developer Portal, go to **Identifiers**
2. Select your App ID (`com.boxstat.app`)
3. Ensure **Push Notifications** is checked
4. If not enabled, enable it and save

**Save These Credentials (you'll need them for backend):**
- **Key ID** - displayed after creating the key
- **Team ID** - found in Apple Developer account membership section
- **Key file (.p8)** - downloaded file, keep it secure!

**Configure in Backend Server:**
Your backend needs these APNs credentials to send push notifications:
- Set `APNS_KEY_ID` environment variable
- Set `APNS_TEAM_ID` environment variable  
- Upload the `.p8` key file to secure server storage

*Note: The existing web-push implementation will need to be configured with these APNs credentials for iOS push notifications. This is a backend configuration step done separately from Xcode.*

## Step 7: Configure Server URL (Production)

The app needs to connect to your backend API. Update `capacitor.config.ts`:

```typescript
server: {
  url: 'https://your-production-app.replit.app',
  cleartext: true,
}
```

Then rebuild and sync:
```bash
npm run build
npx cap sync ios
```

**Important**: 
- Use your actual production URL
- Keep this commented out during development
- The app will use this URL instead of loading local files

## Step 8: Add App Icon and Splash Screen

### App Icon
1. Create a 1024x1024px PNG icon
2. In Xcode, select **Assets.xcassets**
3. Click **AppIcon**
4. Drag your icon to the **App Store iOS** slot
5. Xcode auto-generates all required sizes

### Splash Screen
1. Configured in `capacitor.config.ts` (already set to UYP red)
2. Customize in **Assets.xcassets** → **Splash**

## Step 9: Test on Simulator

1. Select a simulator device (e.g., iPhone 15 Pro)
2. Click the **Play** button or press `Cmd + R`
3. The app will build and launch in the simulator

**Test These Features**:
- ✅ Login/Registration
- ✅ Location permissions (for geo-fencing)
- ✅ Camera permissions (for QR codes)
- ✅ Photo upload (for profile pictures)
- ✅ Push notifications
- ✅ All core features work

## Step 10: Test on Real Device

1. Connect your iPhone/iPad via USB
2. Select your device from device list
3. Click **Play** button
4. First time: Trust your Mac on the device
5. App installs and runs on physical device

**Important**: Test location-based features on real device, not simulator!

## Step 11: Archive for App Store

### A. Set Scheme to Release
1. Go to **Product** → **Scheme** → **Edit Scheme**
2. Select **Run** on left
3. Change **Build Configuration** to **Release**

### B. Create Archive
1. Select **Any iOS Device (arm64)** as target
2. Go to **Product** → **Archive**
3. Wait for build to complete (5-10 minutes)
4. Archive appears in **Organizer**

## Step 12: Upload to App Store Connect

### A. Validate Archive
1. In Organizer, select your archive
2. Click **Validate App**
3. Choose distribution method: **App Store Connect**
4. Select your team
5. Fix any validation errors

### B. Distribute to App Store
1. Click **Distribute App**
2. Choose **App Store Connect**
3. Select upload method
4. Click **Upload**
5. Wait for processing (10-30 minutes)

## Step 13: Configure App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in app information:
   - **Name**: BoxStat
   - **Bundle ID**: com.boxstat.app
   - **SKU**: boxstat-001
   - **User Access**: Full Access

4. Add screenshots (required sizes):
   - 6.7" (iPhone 15 Pro Max): 1290 x 2796 px
   - 5.5" (iPhone 8 Plus): 1242 x 2208 px
   
5. Write app description and keywords
6. Set category: **Sports**
7. Set age rating
8. Set price: **Free**

## Step 14: Submit for Review

1. Select the build you uploaded
2. Add **Privacy Policy URL**
3. Add **Support URL**
4. Fill **App Review Information**
5. Add **Demo Account** (if login required)
6. Click **Submit for Review**

**Review Time**: Usually 1-3 days

## Maintenance & Updates

### For Each Update:

1. **Make changes** on Replit
2. **Build**: `npm run build`
3. **Sync**: `npx cap sync ios`
4. **Update version** in Xcode (e.g., 1.0.1)
5. **Increment build** number (e.g., build 2)
6. **Archive** again
7. **Upload** to App Store Connect
8. **Submit** for review

## Troubleshooting

### Build Fails in Xcode
- Run `pod install` in `ios/App`
- Clean build folder: `Cmd + Shift + K`
- Restart Xcode

### Code Signing Issues
- Verify Apple Developer account is active
- Check Bundle ID matches everywhere
- Regenerate provisioning profiles

### App Crashes on Launch
- Check server URL in `capacitor.config.ts`
- Verify all permissions in Info.plist
- Check Xcode console for errors

### Location Services Not Working
- Ensure Info.plist has location permissions
- Test on real device (simulator may not work)
- Check user granted permission in Settings

### Camera/QR Not Working
- Verify camera permission in Info.plist
- Camera doesn't work in simulator
- Test on real device

## Key Files Reference

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor configuration (app ID, colors, server URL) |
| `ios/App/App/Info.plist` | iOS permissions and settings |
| `ios/App/Podfile` | Native iOS dependencies |
| `dist/public` | Built web app (synced to iOS) |

## Required Permissions (Already Configured)

✅ **Location** - For geo-fencing check-ins  
✅ **Camera** - For QR code scanning  
✅ **Photo Library** - For profile pictures  
✅ **Push Notifications** - For event alerts  

## Production Checklist

Before submitting to App Store:

- [ ] Update server URL to production endpoint
- [ ] Test all features on real device
- [ ] Add proper app icon (1024x1024)
- [ ] Create app screenshots for all required sizes
- [ ] Write clear app description
- [ ] Set up privacy policy URL
- [ ] Set up support URL/email
- [ ] Create demo account for Apple reviewers
- [ ] Test geo-fencing with actual GPS locations
- [ ] Test payment flow (if applicable)
- [ ] Verify all permissions work correctly

## Support

For issues specific to:
- **Capacitor**: https://capacitorjs.com/docs
- **Xcode**: https://developer.apple.com/xcode
- **App Store**: https://developer.apple.com/app-store/review/

---

**BoxStat** - Built with Replit + Capacitor
