import UIKit
import Capacitor
import WebKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Set native window background to black to prevent white gaps during WebView bounce/overscroll
        window?.backgroundColor = UIColor.black
        
        return true
    }
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?, window: UIWindow?) {
        // Additional window configuration after creation
        window?.backgroundColor = UIColor.black
    }
    
    // Called when the bridge is ready - configure WebView backgrounds
    func applicationDidBecomeActive(_ application: UIApplication) {
        // Delay slightly to ensure bridge is fully loaded
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.configureWebViewBackgrounds()
        }
    }
    
    private func configureWebViewBackgrounds() {
        // Find the Capacitor bridge and configure its WebView
        guard let rootVC = window?.rootViewController else { return }
        
        // Set the root view controller's view background
        rootVC.view.backgroundColor = UIColor.black
        
        // Find the WKWebView in the view hierarchy and configure it
        if let webView = findWebView(in: rootVC.view) {
            webView.backgroundColor = UIColor.black
            webView.isOpaque = false
            webView.scrollView.backgroundColor = UIColor.black
            webView.scrollView.bounces = false // Disable rubber-band bounce effect
        }
    }
    
    private func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView {
            return webView
        }
        for subview in view.subviews {
            if let webView = findWebView(in: subview) {
                return webView
            }
        }
        return nil
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
