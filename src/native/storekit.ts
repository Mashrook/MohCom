/**
 * StoreKit2 Service Layer
 *
 * Communicates with the native StoreKitPlugin Capacitor plugin for
 * auto-renewable subscriptions on iOS. Falls back gracefully when
 * running outside the native container.
 *
 * Product IDs:
 *   - com.mohamie.ios.month   (Mohamie Premium شهري - 59.99 SAR)
 *   - com.mohamie.ios.year    (Mohamie Premium سنوي - 599 SAR)
 *   - com.mohamiea.ios.month  (محامي كوم شهري - 59.99 SAR)
 *   - com.mohamiea.ios.year   (محامي كوم سنوي - 599 SAR)
 */

import { registerPlugin } from "@capacitor/core";
import type { EntitlementData } from "./bridge";

// ── Plugin interface ────────────────────────────────────────────

interface StoreKitPluginInterface {
  purchase(options: { productId: string }): Promise<EntitlementData>;
  restore(): Promise<EntitlementData>;
  getEntitlement(): Promise<EntitlementData>;
}

const StoreKitNative = registerPlugin<StoreKitPluginInterface>("StoreKitPlugin");

// ── Helpers ─────────────────────────────────────────────────────

function isNative(): boolean {
  try {
    return !!(window as any).webkit?.messageHandlers?.mohamie;
  } catch {
    return false;
  }
}

const DEFAULT_ENTITLEMENT: EntitlementData = {
  active: false,
  status: "UNKNOWN",
  expiresAt: null,
  productId: null,
};

// ── Public API ──────────────────────────────────────────────────

/**
 * Trigger a native StoreKit2 purchase flow for the given product.
 */
export async function purchase(productId: string): Promise<EntitlementData> {
  if (!isNative()) {
    console.info("[StoreKit] purchase() called outside native — ignored");
    return DEFAULT_ENTITLEMENT;
  }
  try {
    return await StoreKitNative.purchase({ productId });
  } catch (error) {
    console.error("[StoreKit] purchase error:", error);
    throw error;
  }
}

/**
 * Trigger native restore-purchases flow.
 */
export async function restore(): Promise<EntitlementData> {
  if (!isNative()) {
    console.info("[StoreKit] restore() called outside native — ignored");
    return DEFAULT_ENTITLEMENT;
  }
  try {
    return await StoreKitNative.restore();
  } catch (error) {
    console.error("[StoreKit] restore error:", error);
    throw error;
  }
}

/**
 * Read the current entitlement from the native plugin (async).
 */
export async function getEntitlement(): Promise<EntitlementData> {
  if (!isNative()) {
    return DEFAULT_ENTITLEMENT;
  }
  try {
    return await StoreKitNative.getEntitlement();
  } catch {
    return DEFAULT_ENTITLEMENT;
  }
}

const StoreKit = { purchase, restore, getEntitlement };
export default StoreKit;
