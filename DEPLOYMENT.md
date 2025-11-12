# BoxStat iOS Deployment Guide

## 🚀 Quick Deploy (Recommended)

### When you make code changes:

**1. On Replit** (automated script):
```bash
./scripts/deploy-ios.sh
```
✅ Builds production files  
✅ Commits and pushes to git  
✅ Shows next steps  

**2. On your Mac** (automated script):
```bash
cd ~/Documents/boxstat && ./deploy-to-mac.sh
```
✅ Pulls latest code from Replit  
✅ Installs dependencies  
✅ Builds production files  
✅ Syncs to iOS  
✅ Opens Xcode automatically  

**3. In Xcode**:
- Select your iPhone as target device
- Click Run (▶️)

That's it! 🎉

---

## 🔧 Manual Deployment (If Scripts Don't Work)

### On Replit:
```bash
npm run build
git add -A
git commit -m "Deploy update"
git push origin main
```

### On your Mac:
```bash
cd ~/Documents/boxstat
git pull origin main
npm install
npm run build
npx cap sync ios
open ios/App/App.xcworkspace
```

### In Xcode:
- Select iPhone target
- Click Run

---

## 🆕 Fresh Install (For Major Updates)

When deploying big changes like:
- New push notifications
- Database schema changes
- Major feature updates

**In Xcode:**
1. Press **Shift+Cmd+K** (Clean Build Folder)
2. **Delete the app** from your iPhone
3. Click **Run** to do a fresh install

This ensures:
- No cached JavaScript
- Fresh database sync
- All new features work properly

---

## 📱 Push Notifications Setup

After deploying push notification code for the first time:

1. **Fresh install the app** (see above)
2. **Log in** to BoxStat
3. **Check Xcode console** for:
   ```
   User authenticated, initializing push notifications...
   Push token successfully registered with backend
   ```
4. **Test it**: Send a notification from Admin Dashboard
   - Check "Push Notification" delivery channel
   - It should pop up on your iPhone! 🏀

---

## 🐛 Troubleshooting

**App not updating?**
- Delete app from iPhone
- Clean build folder in Xcode (Shift+Cmd+K)
- Fresh install

**Push notifications not working?**
- Check Xcode console for FCM token registration
- Verify Firebase config in Replit Secrets
- Make sure you checked "Push Notification" in admin panel

**Build errors?**
- Run `npm install` on both Replit and Mac
- Check that you've synced latest code: `git pull`

---

## 💡 Pro Tips

- **Quick backend changes**: Just edit on Replit, dev server auto-reloads
- **Testing push**: Use the test script: `node test-push.js`
- **Cache issues**: Always do a fresh install for major updates
- **Speed up builds**: The scripts do everything in one command!

---

## 📋 Deployment Checklist

Before deploying a major update:

- [ ] Test locally on Replit dev server
- [ ] Run `npm run build` successfully
- [ ] Commit and push to git
- [ ] Pull on Mac
- [ ] Sync to iOS with Capacitor
- [ ] Clean build in Xcode (for major changes)
- [ ] Delete app and fresh install (for major changes)
- [ ] Test all new features on iPhone
- [ ] Verify push notifications work

---

Need help? Check the scripts:
- `./scripts/deploy-ios.sh` (Replit side)
- `./deploy-to-mac.sh` (Mac side)