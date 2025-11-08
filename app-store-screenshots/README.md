# BoxStat App Store Screenshots

This folder contains professionally captured screenshots for Apple App Store submission.

## 📱 Screenshots Included

### 5 Key Pages Captured:
1. **Home Page** - Welcome screen with BoxStat branding
2. **Login Screen** - Authentication interface
3. **Parent Dashboard** - Unified account management view
4. **Player Dashboard** - Player stats, badges, and progress
5. **Events** - Event management and scheduling

### 3 Device Sizes (per Apple requirements):
- **iPhone 6.7"** (1284 × 2778px) - iPhone 14 Pro Max, 15 Pro Max
- **iPhone 6.5"** (1242 × 2688px) - iPhone XS Max, 11 Pro Max
- **iPad Pro 12.9"** (2778 × 1284px) - Landscape orientation

## ✅ Verified Dimensions

All screenshots have been verified to match Apple's exact requirements:
- iPhone 6.7": 1284 × 2778px ✅
- iPhone 6.5": 1242 × 2688px ✅
- iPad Pro: 2778 × 1284px ✅

## 📤 How to Download

### Option 1: Download via Replit File Manager
1. In Replit, click on the **Files** panel (left sidebar)
2. Navigate to `app-store-screenshots/` folder
3. Right-click on any screenshot → **Download**
4. Or select multiple files and download as a ZIP

### Option 2: Download All at Once
From your terminal, create a ZIP file:
```bash
cd app-store-screenshots
zip -r boxstat-screenshots.zip *.png
```
Then download the `boxstat-screenshots.zip` file from the Files panel.

### Option 3: Clone from GitHub
If this project is on GitHub:
```bash
git clone <your-repo-url>
cd <repo-name>/app-store-screenshots
```

## 📋 File Naming Convention

Files are named using this pattern:
```
[page-number]-[page-name]-[device-type].png
```

Examples:
- `01-home-iphone-67.png` - Home page for iPhone 6.7"
- `03-parent-dashboard-ipad-pro.png` - Parent dashboard for iPad Pro

## 🚀 Uploading to App Store Connect

1. Log in to **App Store Connect**
2. Go to **My Apps** → Select your app
3. Navigate to **App Store** tab
4. Scroll to **App Previews and Screenshots**
5. For each device size:
   - Click **+** to add screenshots
   - Upload the corresponding screenshots (iPhone 6.7", iPhone 6.5", iPad Pro)
   - Drag to reorder if needed
6. Click **Save**

## 📝 Tips for App Store Submission

- **Order**: Arrange screenshots to tell a story (home → login → main features)
- **First Screenshot**: Most important - shows in search results
- **Descriptions**: Add compelling captions in App Store Connect
- **Localization**: Create versions in different languages if needed

## 🔄 Regenerating Screenshots

If you need to update screenshots:
```bash
npx tsx scripts/capture-screenshots.ts
```

To verify dimensions:
```bash
npx tsx scripts/verify-screenshots.ts
```

---

**Total Screenshots**: 15 (5 pages × 3 device sizes)
**Ready for**: Apple App Store submission ✅
