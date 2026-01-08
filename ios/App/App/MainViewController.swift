import UIKit
import Capacitor
import WebKit

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Set view controller background to white (matches app theme)
        view.backgroundColor = UIColor.white
        
        // Configure WebView backgrounds and disable bouncing
        configureWebViewBackground()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // Reapply settings in case they were reset
        configureWebViewBackground()
    }
    
    private func configureWebViewBackground() {
        guard let webView = webView else { return }
        
        // Set WebView backgrounds to white (matches app theme)
        webView.backgroundColor = UIColor.white
        webView.scrollView.backgroundColor = UIColor.white
        
        // Set layer backgrounds for complete coverage during rubber-band
        webView.layer.backgroundColor = UIColor.white.cgColor
        webView.scrollView.layer.backgroundColor = UIColor.white.cgColor
        
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
