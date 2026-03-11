import Foundation
import Capacitor
import StoreKit

// MARK: - StoreKit2 Capacitor Plugin
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKitPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEntitlement", returnType: CAPPluginReturnPromise),
    ]

    private var transactionListener: Task<Void, Error>?

    // Known subscription product IDs
    private let subscriptionProductIds: Set<String> = [
        "com.mohamie.ios.month",
        "com.mohamie.ios.year",
        "com.mohamiea.ios.month",
        "com.mohamiea.ios.year"
    ]

    // MARK: - Lifecycle

    override public func load() {
        startTransactionListener()
    }

    deinit {
        transactionListener?.cancel()
    }

    /// Listen for transaction updates (renewals, revocations, etc.)
    private func startTransactionListener() {
        transactionListener = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                if let transaction = self.verified(result) {
                    await transaction.finish()
                    let entitlement = await self.currentEntitlement()
                    await MainActor.run {
                        self.injectEntitlement(entitlement)
                    }
                }
            }
        }
    }

    // MARK: - Plugin Methods

    /// Purchase a subscription product
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId")
            return
        }

        guard subscriptionProductIds.contains(productId) else {
            call.reject("Invalid productId: \(productId)")
            return
        }

        Task {
            do {
                // 1. Load product from App Store
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                // 2. Initiate purchase
                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    // 3. Verify transaction
                    guard let transaction = verified(verification) else {
                        call.reject("Transaction verification failed")
                        return
                    }

                    // 4. Always finish the transaction
                    await transaction.finish()

                    // 5. Get current entitlement and return
                    let entitlement = await currentEntitlement()
                    await MainActor.run {
                        self.injectEntitlement(entitlement)
                    }
                    call.resolve(entitlement)

                case .userCancelled:
                    call.reject("Purchase cancelled by user")

                case .pending:
                    call.reject("Purchase pending approval")

                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    /// Restore purchases by checking current entitlements
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                // Sync with App Store to ensure latest state
                try await AppStore.sync()

                let entitlement = await currentEntitlement()
                await MainActor.run {
                    self.injectEntitlement(entitlement)
                }
                call.resolve(entitlement)
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    /// Get the current entitlement status
    @objc func getEntitlement(_ call: CAPPluginCall) {
        Task {
            let entitlement = await currentEntitlement()
            call.resolve(entitlement)
        }
    }

    // MARK: - StoreKit2 Helpers

    /// Verify a transaction using StoreKit2 built-in verification
    private func verified(_ result: VerificationResult<Transaction>) -> Transaction? {
        switch result {
        case .verified(let transaction):
            return transaction
        case .unverified(_, let error):
            print("[StoreKit] Unverified transaction rejected: \(error.localizedDescription)")
            return nil
        }
    }

    /// Check current entitlements and return status dictionary
    private func currentEntitlement() async -> [String: Any] {
        var activeTransaction: Transaction?

        for await result in Transaction.currentEntitlements {
            if let transaction = verified(result) {
                if subscriptionProductIds.contains(transaction.productID) {
                    // Pick the transaction with the latest expiration
                    if let existing = activeTransaction {
                        if let newExp = transaction.expirationDate,
                           let existingExp = existing.expirationDate,
                           newExp > existingExp {
                            activeTransaction = transaction
                        }
                    } else {
                        activeTransaction = transaction
                    }
                }
            }
        }

        guard let transaction = activeTransaction else {
            return [
                "active": false,
                "status": "UNKNOWN",
                "expiresAt": NSNull(),
                "productId": NSNull()
            ]
        }

        let isExpired: Bool
        if let expirationDate = transaction.expirationDate {
            isExpired = expirationDate < Date()
        } else {
            isExpired = false
        }

        let isRevoked = transaction.revocationDate != nil

        let status: String
        if isRevoked {
            status = "CANCELLED"
        } else if isExpired {
            status = "EXPIRED"
        } else {
            status = "ACTIVE"
        }

        let expiresAt: Any
        if let expirationDate = transaction.expirationDate {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            expiresAt = formatter.string(from: expirationDate)
        } else {
            expiresAt = NSNull()
        }

        return [
            "active": !isExpired && !isRevoked,
            "status": status,
            "expiresAt": expiresAt,
            "productId": transaction.productID
        ]
    }

    // MARK: - WebView Bridge Injection

    /// Inject entitlement data into the web layer via MOHAMIE_NATIVE bridge
    private func injectEntitlement(_ entitlement: [String: Any]) {
        guard let webView = self.bridge?.webView else { return }

        do {
            let data = try JSONSerialization.data(withJSONObject: entitlement, options: [])
            guard let jsonString = String(data: data, encoding: .utf8) else { return }

            let js = """
            if (window.MOHAMIE_NATIVE && window.MOHAMIE_NATIVE.setEntitlement) {
                window.MOHAMIE_NATIVE.setEntitlement(\(jsonString));
            }
            """
            webView.evaluateJavaScript(js) { _, error in
                if let error = error {
                    print("[StoreKit] JS injection error: \(error.localizedDescription)")
                }
            }
        } catch {
            print("[StoreKit] JSON serialization error: \(error.localizedDescription)")
        }
    }
}
