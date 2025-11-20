import UIKit
import Capacitor
import Firebase
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // 1. Initialize Firebase
        FirebaseApp.configure()

        // DEBUG: Confirm Plist presence
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
            print("🔥 FOUND GOOGLE PLIST AT RUNTIME: \(path)")
        } else {
            print("❌ GOOGLE PLIST MISSING AT RUNTIME — Firebase WILL CRASH")
        }

        return true
    }

    // ---------------------------------------------------------------------------
    // PUSH NOTIFICATION HANDLERS
    // ---------------------------------------------------------------------------

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // 1. Hand the token to Firebase (Necessary because we disabled auto-swizzling)
        Messaging.messaging().apnsToken = deviceToken
        
        // 2. Hand the token to Capacitor (Necessary so your JS `PushNotifications.register()` promise resolves)
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
        
        print("✅ [AppDelegate] Device Token received and passed to Capacitor & Firebase")
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // 1. Tell Capacitor we failed
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
        
        print("❌ [AppDelegate] Failed to register for remote notifications: \(error)")
    }
}
