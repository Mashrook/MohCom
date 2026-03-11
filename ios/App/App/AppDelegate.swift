import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Inject entitlement into webview when app becomes active
        injectEntitlementOnActive()
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Entitlement Injection

    private func injectEntitlementOnActive() {
        guard let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.bridge?.webView else { return }

        // Use the StoreKitPlugin to get entitlement and inject it
        let js = """
        (async function() {
            try {
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StoreKitPlugin) {
                    const ent = await window.Capacitor.Plugins.StoreKitPlugin.getEntitlement();
                    if (window.MOHAMIE_NATIVE && window.MOHAMIE_NATIVE.setEntitlement) {
                        window.MOHAMIE_NATIVE.setEntitlement(ent);
                    }
                }
            } catch(e) {
                console.log('[AppDelegate] entitlement injection skipped:', e);
            }
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
