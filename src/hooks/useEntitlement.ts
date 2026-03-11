import { useState, useEffect } from "react";
import type { EntitlementData } from "@/native/bridge";

const STORAGE_KEY = "mohamie_entitlement";

const DEFAULT: EntitlementData = {
  active: false,
  status: "UNKNOWN",
  expiresAt: null,
  productId: null,
};

function readFromStorage(): EntitlementData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT };
}

/**
 * React hook that tracks the native entitlement state.
 * Works in both browser and iOS WKWebView.
 */
export function useEntitlement() {
  const [entitlement, setEntitlement] = useState<EntitlementData>(readFromStorage);

  useEffect(() => {
    const bridge = (window as any).MOHAMIE_NATIVE;
    if (bridge?.onEntitlementChanged) {
      const unsub = bridge.onEntitlementChanged((data: EntitlementData) => {
        setEntitlement(data);
      });
      return unsub;
    }
  }, []);

  return entitlement;
}

export function useIsInsideNativeApp(): boolean {
  try {
    return !!(window as any).webkit?.messageHandlers?.mohamie;
  } catch {
    return false;
  }
}
