import UIKit
import Capacitor

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
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
    
    // ---------------------------------------------------------------------------
    // SCENE LIFECYCLE (Required for modern iOS)
    // ---------------------------------------------------------------------------
    
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {}
}
