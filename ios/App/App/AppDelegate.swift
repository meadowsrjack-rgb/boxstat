import UIKit
import Capacitor

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Set window background to black to prevent white gaps during overscroll/bounce
        window?.backgroundColor = UIColor.black
        
        // Access the Capacitor bridge to set WebView backgrounds
        if let rootVC = window?.rootViewController as? CAPBridgeViewController {
            rootVC.view.backgroundColor = UIColor.black
            
            // Set WebView scroll view background and disable bouncing
            if let webView = rootVC.webView {
                webView.backgroundColor = UIColor.black
                webView.scrollView.backgroundColor = UIColor.black
                webView.scrollView.bounces = false
                webView.isOpaque = false
            }
        }
        
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
}
