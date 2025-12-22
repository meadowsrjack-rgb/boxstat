import UIKit
import Capacitor

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Set window background to black immediately
        window?.backgroundColor = UIColor.black
        
        // Defer WebView configuration until after Capacitor initializes it
        DispatchQueue.main.async { [weak self] in
            self?.configureWebView()
        }
        
        return true
    }
    
    // Configure WebView after Capacitor has set it up
    private func configureWebView() {
        guard let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.webView else {
            return
        }
        
        // Set all backgrounds to black
        rootVC.view.backgroundColor = UIColor.black
        webView.backgroundColor = UIColor.black
        webView.scrollView.backgroundColor = UIColor.black
        
        // Set layer backgrounds for complete coverage
        webView.layer.backgroundColor = UIColor.black.cgColor
        webView.scrollView.layer.backgroundColor = UIColor.black.cgColor
        
        // Disable rubber-banding/bouncing
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        
        // Make WebView non-opaque so background shows through
        webView.isOpaque = false
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
