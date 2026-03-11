/**
 * Native iOS Bridge Layer
 * 
 * Establishes communication between the web app and the native iOS WKWebView container.
 * Maintains global entitlement state and exposes methods for:
 * - Setting entitlement data
 * - Subscribing to entitlement changes
 * - Requesting entitlement refresh from native
 * - Opening the native paywall
 * - Handling purchase results
 * 
 * Safe to import in any environment — fails silently when not inside iOS.
 */

export interface EntitlementData {
  active: boolean;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "UNKNOWN";
  expiresAt: string | null;
  productId: string | null;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

type EntitlementListener = (data: EntitlementData) => void;
type PurchaseResultListener = (result: PurchaseResult) => void;

const STORAGE_KEY = "mohamie_entitlement";

const DEFAULT_ENTITLEMENT: EntitlementData = {
  active: false,
  status: "UNKNOWN",
  expiresAt: null,
  productId: null,
};

// ── Internal state ──────────────────────────────────────────────
let _entitlement: EntitlementData = { ...DEFAULT_ENTITLEMENT };
const _listeners: EntitlementListener[] = [];
const _purchaseListeners: PurchaseResultListener[] = [];

// ── Helpers ─────────────────────────────────────────────────────

function persist(data: EntitlementData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — ignore
  }
}

function loadFromStorage(): EntitlementData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ENTITLEMENT, ...parsed };
    }
  } catch {
    // corrupt data — ignore
  }
  return { ...DEFAULT_ENTITLEMENT };
}

function notifyListeners() {
  const snapshot = { ..._entitlement };
  _listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // never let a bad listener break the bridge
    }
  });
}

function postToNative(action: string, payload?: Record<string, unknown>) {
  try {
    const handler = (window as any).webkit?.messageHandlers?.mohamie;
    if (handler) {
      handler.postMessage({ action, ...payload });
      return true;
    }
  } catch {
    // not inside iOS — ignore
  }
  return false;
}

// ── Public API (attached to window.MOHAMIE_NATIVE) ──────────────

function setEntitlement(data: Partial<EntitlementData>) {
  _entitlement = { ...DEFAULT_ENTITLEMENT, ...data };
  persist(_entitlement);
  notifyListeners();
}

function onEntitlementChanged(callback: EntitlementListener): () => void {
  _listeners.push(callback);
  // immediately fire with current state
  try {
    callback({ ..._entitlement });
  } catch { /* ignore */ }
  return () => {
    const idx = _listeners.indexOf(callback);
    if (idx > -1) _listeners.splice(idx, 1);
  };
}

function requestEntitlement() {
  postToNative("requestEntitlement");
}

function openPaywall() {
  postToNative("openPaywall");
}

function restorePurchases() {
  postToNative("restorePurchases");
}

function purchaseResult(result: PurchaseResult) {
  _purchaseListeners.forEach((fn) => {
    try {
      fn(result);
    } catch { /* ignore */ }
  });

  if (result.success) {
    requestEntitlement();
  }
}

function onPurchaseResult(callback: PurchaseResultListener): () => void {
  _purchaseListeners.push(callback);
  return () => {
    const idx = _purchaseListeners.indexOf(callback);
    if (idx > -1) _purchaseListeners.splice(idx, 1);
  };
}

function getEntitlement(): EntitlementData {
  return { ..._entitlement };
}

function isInsideNativeApp(): boolean {
  try {
    return !!(window as any).webkit?.messageHandlers?.mohamie;
  } catch {
    return false;
  }
}

// ── Bootstrap ───────────────────────────────────────────────────

// Load persisted entitlement
_entitlement = loadFromStorage();

// Expose on window
const bridge = {
  setEntitlement,
  onEntitlementChanged,
  onPurchaseResult,
  requestEntitlement,
  openPaywall,
  restorePurchases,
  purchaseResult,
  getEntitlement,
  isInsideNativeApp,
};

(window as any).MOHAMIE_NATIVE = bridge;
(window as any).MOHAMIE_ENTITLEMENT = _entitlement;

// Auto-request entitlement from native on load
if (isInsideNativeApp()) {
  requestEntitlement();
}

export default bridge;
