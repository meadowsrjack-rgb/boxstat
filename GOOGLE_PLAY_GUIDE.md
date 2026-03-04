# BoxStat — Google Play Store Publishing Guide

This guide walks you through building and publishing the BoxStat Android app to the Google Play Store.

## Prerequisites

1. **Android Studio** — Download from https://developer.android.com/studio
2. **Java Development Kit (JDK) 17+** — Android Studio usually bundles this
3. **Google Play Developer Account** — $25 one-time registration fee at https://play.google.com/console

## Step 1: Open the Android Project

1. Open Android Studio
2. Click **"Open"** and select the `android/` folder inside the BoxStat project
3. Wait for Gradle to finish syncing (this may take a few minutes on first open)

## Step 2: Set Up App Icons

The default Capacitor icons need to be replaced with the BoxStat logo:

1. In Android Studio, right-click `app/src/main/res` → **New → Image Asset**
2. Choose **Launcher Icons (Adaptive and Legacy)**
3. For **Foreground Layer**, select **Image** and pick your BoxStat logo PNG (use the same one from the iOS app)
4. For **Background Layer**, set the color to white (`#FFFFFF`)
5. Click **Next** → **Finish**

This generates all the required icon sizes automatically.

## Step 3: Set Up Firebase Cloud Messaging (Push Notifications)

BoxStat's server already supports Firebase push notifications. You just need to link the Android app:

1. Go to the **Firebase Console** at https://console.firebase.google.com
2. Open your existing BoxStat Firebase project (the one used for the server's `FIREBASE_SERVICE_ACCOUNT_JSON`)
3. Click **Project Settings** → **General** → **Add app** → choose **Android**
4. Enter the package name: `boxstat.app`
5. Download the `google-services.json` file
6. Place it in `android/app/google-services.json` (the `app/` directory, not the root `android/` directory)
7. Rebuild the project

## Step 4: Test on a Device or Emulator

Before publishing, test the app:

1. In Android Studio, click **Run → Run 'app'** (or the green play button)
2. Choose a connected Android device or create an emulator
3. Verify:
   - The app loads from `boxstat.app` (the live server)
   - Login works
   - GPS check-in works (test with a real device)
   - Push notifications register
   - Deep links work (tap a `boxstat://` link)

## Step 5: Generate a Signing Keystore

Google Play requires apps to be signed with a release key:

1. In Android Studio, go to **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle**
3. Click **Create new...** to create a new keystore
   - **Key store path**: Choose a safe location (NOT inside the project — keep it private)
   - **Password**: Create a strong password and save it somewhere safe
   - **Alias**: `boxstat-release`
   - **Validity**: 25 years
   - Fill in at least one name field (e.g., organization name)
4. Click **OK**

**IMPORTANT**: Back up your keystore file and password. If you lose them, you can never update the app on Google Play.

## Step 6: Build a Release AAB

1. Go to **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle** (Google Play requires AAB, not APK)
3. Select your keystore from Step 5
4. Choose **release** build variant
5. Click **Create**
6. The signed AAB will be at: `android/app/release/app-release.aab`

## Step 7: Create the App on Google Play Console

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - **App name**: BoxStat
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free (you handle payments in-app via Stripe)
4. Accept the declarations and click **Create app**

## Step 8: Complete the Store Listing

Under **Main store listing**, fill in:

- **Short description** (80 chars max): "Basketball management for teams, parents, and coaches"
- **Full description**: Describe BoxStat's features (scheduling, payments, player development, etc.)
- **Screenshots**: At least 2 phone screenshots (take them from the emulator or a device)
- **Feature graphic**: 1024 x 500 px banner image
- **App icon**: 512 x 512 px (high-res version of your app icon)

## Step 9: Complete the App Content Questionnaire

Google Play requires you to answer questions about your app:

1. **Privacy policy**: Add a URL to your privacy policy (required since the app collects location data and personal info)
2. **Ads**: No ads
3. **Content rating**: Complete the IARC questionnaire
4. **Target audience**: Select appropriate age groups
5. **Data safety**: Declare what data the app collects (location, email, payment info, etc.)

## Step 10: Upload and Release

1. Go to **Production** → **Create new release**
2. If prompted about Play App Signing, accept (recommended — Google manages your signing key)
3. Upload the `app-release.aab` file from Step 6
4. Add release notes (e.g., "Initial release")
5. Click **Review release** → **Start rollout to Production**

Google will review your app. This usually takes 1-3 days for a new app.

## Updating the App

Since BoxStat loads from the live server (`boxstat.app`), most updates happen automatically when you deploy changes to your server. You only need to rebuild and upload a new AAB if you:

- Change the Capacitor config
- Update Capacitor plugins
- Change Android-specific native code
- Need to update the store listing

## Troubleshooting

**App shows a blank white screen**
- Check that `boxstat.app` is accessible from the device/emulator
- Verify the `server.url` in `capacitor.config.ts` is correct

**Push notifications don't work**
- Make sure `google-services.json` is in the right place (`android/app/`)
- Verify the Firebase project is the same one your server uses

**Location permission not working**
- Make sure the app requests location permission at runtime (the web app already handles this)
- Check that `ACCESS_FINE_LOCATION` is in the AndroidManifest

**Deep links not opening the app**
- Test with: `adb shell am start -a android.intent.action.VIEW -d "boxstat://payment-success"`
