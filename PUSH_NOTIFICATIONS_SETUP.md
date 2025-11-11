# iOS Push Notifications Setup Guide

This guide will walk you through setting up native push notifications for your BoxStat iOS app using Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs).

## Overview

Your app now supports **dual push notification systems**:
- **Web Push**: For PWA users on desktop/Android browsers (already working)
- **Native Push (FCM)**: For iOS app users via Capacitor (needs configuration)

## Prerequisites

- ✅ Paid Apple Developer account ($99/year) - **REQUIRED** for push notifications
- ✅ Firebase account (free)
- ✅ Physical iOS device for testing (simulator doesn't support push)
- ✅ Xcode installed on your Mac

---

## Part 1: Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Project name: `BoxStat` (or any name you prefer)
4. Click **Continue** through the setup wizard
5. **Disable** Google Analytics (not needed) or enable if you want analytics
6. Click **Create Project**

### Step 2: Add iOS App to Firebase

1. In your Firebase project, click the **iOS icon** to add an iOS app
2. **iOS bundle ID**: `com.boxstat.app` (must match your capacitor.config.ts)
3. **App nickname**: BoxStat
4. **App Store ID**: Leave blank for now (add later when published)
5. Click **Register app**

### Step 3: Download GoogleService-Info.plist

1. Firebase will generate a `GoogleService-Info.plist` file
2. Click **Download GoogleService-Info.plist**
3. **Save this file** - you'll need it for Xcode later
4. Click **Next** through the remaining steps (we'll handle SDK setup differently)
5. Click **Continue to console**

### Step 4: Get Firebase Service Account JSON

1. In Firebase Console, click the **gear icon** (Settings) → **Project settings**
2. Go to the **Service accounts** tab
3. Click **Generate new private key**
4. Click **Generate key** in the confirmation dialog
5. A JSON file will download - **save this securely** (contains sensitive credentials)
6. **Important**: Keep this file private, never commit it to git

---

## Part 2: Apple Developer Portal Setup

### Step 5: Create App Identifier with Push Capability

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → Click the **+** button
4. Select **App IDs** → Click **Continue**
5. Select **App** → Click **Continue**
6. Fill in the details:
   - **Description**: BoxStat
   - **Bundle ID**: Select **Explicit** and enter `com.boxstat.app`
7. Scroll down to **Capabilities** and check **Push Notifications**
8. Click **Continue** → **Register**

### Step 6: Create APNs Authentication Key

1. In Apple Developer Portal, go to **Keys** (in the sidebar)
2. Click the **+** button to create a new key
3. **Key Name**: BoxStat Push Notifications
4. Check **Apple Push Notifications service (APNs)**
5. Click **Continue** → **Register**
6. **Download the .p8 key file** - you can only download this ONCE
7. Note the **Key ID** (displayed on the page)
8. Note your **Team ID** (top-right corner of the page)
9. **Important**: Save the .p8 file securely, you cannot download it again

---

## Part 3: Connect APNs to Firebase

### Step 7: Upload APNs Key to Firebase

1. Return to [Firebase Console](https://console.firebase.google.com/)
2. Go to **Project Settings** → **Cloud Messaging** tab
3. Scroll to **Apple app configuration**
4. Click **Upload** next to "APNs Authentication Key"
5. Upload your `.p8` file
6. Enter the **Key ID** (from Step 6)
7. Enter your **Team ID** (from Step 6)
8. Click **Upload**

Your Firebase project is now configured to send push notifications to iOS!

---

## Part 4: Configure Xcode Project

### Step 8: Add GoogleService-Info.plist to Xcode

1. On your Mac, navigate to your project:
   ```bash
   cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/boxstat
   ```

2. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```

3. In Xcode, in the left sidebar, find the **App** folder
4. **Right-click** on the **App** folder → **Add Files to "App"...**
5. Select the `GoogleService-Info.plist` file you downloaded in Step 3
6. **Important**: Check **"Copy items if needed"**
7. **Important**: Ensure **"Add to targets"** has **App** checked
8. Click **Add**

### Step 9: Enable Push Notifications Capability

1. In Xcode, select the **App** target (top-left, should be highlighted)
2. Go to the **Signing & Capabilities** tab
3. Click **+ Capability** (top-left)
4. Select **Push Notifications**
5. Click **+ Capability** again
6. Select **Background Modes**
7. Under Background Modes, check **Remote notifications**

### Step 10: Update iOS Podfile

1. In Xcode, close the project (Cmd+Q)
2. Open Terminal and navigate to the iOS directory:
   ```bash
   cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/boxstat/ios/App
   ```

3. Edit the Podfile:
   ```bash
   nano Podfile
   ```

4. Find the section that starts with `target 'App' do`
5. After `capacitor_pods`, add these lines:
   ```ruby
   # Firebase for push notifications
   pod 'FirebaseMessaging'
   ```

6. Save and exit (Ctrl+X, then Y, then Enter)

7. Install the Firebase pod:
   ```bash
   pod install
   ```

### Step 11: Update AppDelegate.swift

1. Reopen Xcode:
   ```bash
   cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/boxstat
   npx cap open ios
   ```

2. In the left sidebar, navigate to **App** → **App** → **AppDelegate.swift**
3. Click to open it
4. Replace the entire file with this code:

```swift
import UIKit
import Capacitor
import Firebase

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase
        FirebaseApp.configure()
        
        // Register for remote notifications
        application.registerForRemoteNotifications()
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { token, error in
            if let error = error {
                NotificationCenter.default.post(
                    name: .capacitorDidFailToRegisterForRemoteNotifications,
                    object: error
                )
            } else if let token = token {
                print("📱 FCM Token: \(token)")
                NotificationCenter.default.post(
                    name: .capacitorDidRegisterForRemoteNotifications,
                    object: token
                )
            }
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }
}
```

5. Save the file (Cmd+S)

---

## Part 5: Configure Replit Environment

### Step 12: Add Firebase Service Account to Replit Secrets

1. Open your Replit project in a web browser
2. Click **Tools** → **Secrets** (or the lock icon in the sidebar)
3. Click **+ New Secret**
4. **Key**: `FIREBASE_SERVICE_ACCOUNT_KEY`
5. **Value**: Open the JSON file you downloaded in Step 4 and paste the ENTIRE contents
   - It should look like:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     ...
   }
   ```
6. Click **Add secret**

### Step 13: Restart Your Replit Server

1. In Replit, open the **Shell** tab
2. The server should automatically restart
3. Look for this message in the console:
   ```
   ✅ Firebase Admin initialized for FCM push notifications
   ```

If you see this message, Firebase is configured correctly!

If you see a warning instead, check that your secret was added correctly.

---

## Part 6: Sync Code and Build

### Step 14: Build and Sync to iOS

1. In Replit Shell, run:
   ```bash
   npm run build
   npx cap sync ios
   ```

2. This will:
   - Build your latest web code
   - Copy it to the iOS project
   - Update Capacitor plugins

### Step 15: Download Updated iOS Folder (Optional)

If you're working locally:

1. In Replit, commit and push your changes:
   - Click the **Git** pane
   - Commit your changes
   - Push to remote

2. On your Mac:
   ```bash
   cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/boxstat
   git pull
   ```

---

## Part 7: Test Push Notifications

### Step 16: Build and Run on Physical Device

1. Connect your iPhone/iPad to your Mac via USB
2. In Xcode, at the top, select your device from the device dropdown
3. Click the **Play** button (or Cmd+R) to build and run
4. **First run**: You'll need to:
   - Trust your developer certificate on the device (Settings → General → VPN & Device Management)
   - Allow notifications when prompted

### Step 17: Verify Token Registration

1. Watch the Xcode console for:
   ```
   📱 FCM Token: <long-token-string>
   ```

2. Check your Replit server logs for:
   ```
   POST /api/push/register 200
   ```

This means your device successfully registered for push notifications!

### Step 18: Send a Test Notification

**Option 1: Firebase Console**
1. Go to Firebase Console → **Messaging**
2. Click **Create your first campaign** → **Firebase Notification messages**
3. Enter a title and message
4. Click **Next**
5. Target: **BoxStat iOS app**
6. Click **Review** → **Publish**

**Option 2: From BoxStat Admin Dashboard**
1. Log into your BoxStat app as an admin
2. Go to **Admin Dashboard** → **Notifications** tab
3. Create a notification with:
   - Delivery method: **Push**
   - Target: A specific user or everyone
4. Send the notification
5. It should appear on your iOS device!

---

## Troubleshooting

### Not receiving notifications?

**Check these:**

1. ✅ Physical device (not simulator)
2. ✅ Notification permissions granted in iOS Settings
3. ✅ Firebase service account added to Replit Secrets
4. ✅ APNs key uploaded to Firebase
5. ✅ GoogleService-Info.plist in Xcode
6. ✅ Push Notifications capability enabled in Xcode
7. ✅ FirebaseMessaging pod installed
8. ✅ Bundle ID matches everywhere: `com.boxstat.app`

**Check logs:**

- Xcode console: Look for FCM token
- Replit logs: Look for "Firebase Admin initialized"
- Firebase Console → Cloud Messaging: Check for errors

### Common Issues

**"Missing GoogleService-Info.plist"**
- Make sure you added it to Xcode with "Copy items if needed" checked

**"Push Notifications capability missing"**
- Add it in Xcode: Target → Signing & Capabilities → + Capability

**"Failed to initialize Firebase"**
- Check that FIREBASE_SERVICE_ACCOUNT_KEY is valid JSON
- Make sure private key includes `\n` for line breaks

**"Token not registering"**
- Check device is registered in Apple Developer Portal
- Verify APNs key is uploaded to Firebase
- Make sure app Bundle ID matches everywhere

---

## Next Steps After Setup

### Production Deployment

When you're ready to publish to the App Store:

1. Create a **Production** provisioning profile in Apple Developer Portal
2. Upload a production APNs key to Firebase (or reuse the same key)
3. Build your app for distribution
4. Submit to App Store

### Security Best Practices

- Keep your Firebase service account JSON secure (never commit to git)
- Rotate APNs keys annually
- Monitor notification delivery rates in Firebase Console
- Implement token cleanup for users who uninstall the app

---

## Summary

You've successfully set up:

✅ Firebase project with iOS app configuration
✅ Apple Push Notification service (APNs) integration
✅ Firebase Cloud Messaging (FCM) for cross-platform delivery
✅ Xcode project with push notification capabilities
✅ Backend support for dual push systems (web + native)
✅ Database schema for both subscription types

Your app now supports push notifications for:
- 📱 **iOS app users** (via FCM + APNs)
- 🌐 **Web/PWA users** (via web push)

Both systems work independently and can deliver notifications to users on their preferred platform!
