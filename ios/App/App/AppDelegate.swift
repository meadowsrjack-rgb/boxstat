import UIKit
import Capacitor

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    
    // APNs environment detection - set at compile time
    static var apnsEnvironment: String {
        #if DEBUG
        return "sandbox"
        #else
        return "production"
        #endif
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Set window background to black (MainViewController handles WebView config)
        window?.backgroundColor = UIColor.black
        
        // Store APNs environment in UserDefaults for JavaScript access via Capacitor Preferences
        // Capacitor Preferences uses "CapacitorStorage" prefix for its keys
        let preferencesKey = "CapacitorStorage.apnsEnvironment"
        UserDefaults.standard.set(AppDelegate.apnsEnvironment, forKey: preferencesKey)
        // Also store without prefix as fallback
        UserDefaults.standard.set(AppDelegate.apnsEnvironment, forKey: "apnsEnvironment")
        UserDefaults.standard.synchronize()
        print("📱 [AppDelegate] APNs Environment: \(AppDelegate.apnsEnvironment) (stored to \(preferencesKey))")
        
        return true
    }

    // ---------------------------------------------------------------------------
    // URL / DEEP LINK HANDLERS
    //
    // These two methods are required for Capacitor's @capacitor/app plugin to
    // surface `appUrlOpen` events to JavaScript. Without them, iOS silently
    // drops both custom-scheme URLs (boxstat://...) AND Universal Links
    // (https://boxstat.app/...) before the WebView ever sees them, breaking
    // every deep-link flow: claim-verify, magic-link sign-in, verify-email,
    // invite, and the Stripe payment-success / payment-canceled returns from
    // the in-app browser.
    // ---------------------------------------------------------------------------

    // Custom-scheme URLs (boxstat://...). Triggered when the in-app Stripe
    // checkout browser redirects to boxstat://payment-success or when any
    // other app opens us via our registered scheme.
    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // Universal Links (https://boxstat.app/...). Triggered when a user taps a
    // link in Mail, Safari, Messages, etc. that matches an `applinks:` entry
    // in App.entitlements and the AASA file on the server.
    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application,
                                                           continue: userActivity,
                                                           restorationHandler: restorationHandler)
    }

    // ---------------------------------------------------------------------------
    // PUSH NOTIFICATION HANDLERS - Direct APNs (No Firebase)
    // ---------------------------------------------------------------------------

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Convert token to hex string for logging
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("✅ [AppDelegate] APNs Device Token: \(token)")
        
        // Hand the token to Capacitor so JS `PushNotifications.register()` promise resolves
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Tell Capacitor we failed
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
        
        print("❌ [AppDelegate] Failed to register for remote notifications: \(error)")
    }
}
