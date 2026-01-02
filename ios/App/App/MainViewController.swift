import UIKit
import Capacitor
import WebKit

class MainViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Set view controller background to black
        view.backgroundColor = UIColor.black
        
        // Configure WebView backgrounds and disable bouncing
        configureWebViewForBlackBackground()
        
        // Inject APNs environment detection script for JavaScript
        injectApnsEnvironment()
    }
    
    private func injectApnsEnvironment() {
        guard let webView = webView else { return }
        
        // Determine APNs environment based on build configuration
        #if DEBUG
        let apnsEnvironment = "sandbox"
        #else
        let apnsEnvironment = "production"
        #endif
        
        // Inject as a global JavaScript variable
        let script = "window.APNS_ENVIRONMENT = '\(apnsEnvironment)';"
        
        let userScript = WKUserScript(
            source: script,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        
        webView.configuration.userContentController.addUserScript(userScript)
        print("📱 [MainViewController] Injected APNS_ENVIRONMENT: \(apnsEnvironment)")
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // Reapply settings in case they were reset
        configureWebViewForBlackBackground()
    }
    
    private func configureWebViewForBlackBackground() {
        guard let webView = webView else { return }
        
        // Set WebView backgrounds to black
        webView.backgroundColor = UIColor.black
        webView.scrollView.backgroundColor = UIColor.black
        
        // Set layer backgrounds for complete coverage during rubber-band
        webView.layer.backgroundColor = UIColor.black.cgColor
        webView.scrollView.layer.backgroundColor = UIColor.black.cgColor
        
        // Clip to bounds to prevent overflow
        webView.scrollView.clipsToBounds = true
        
        // Disable all rubber-banding/bouncing
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        
        // Prevent content inset adjustments that could cause gaps
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        
        // Make WebView non-opaque so background shows through any transparent areas
        webView.isOpaque = false
    }
}
