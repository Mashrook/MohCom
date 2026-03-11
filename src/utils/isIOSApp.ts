/**
 * Detects if the app is running inside an iOS WebView (Capacitor)
 * OR if APPLE_REVIEW_MODE is enabled via environment variable.
 * 
 * When APPLE_REVIEW_MODE=true, subscription/payment UI is hidden
 * regardless of platform - useful during App Store review.
 * 
 * Returns true only when:
 * - VITE_APPLE_REVIEW_MODE env var is "true", OR
 * - The device is iOS and the browser is a WebView (not regular Safari)
 * 
 * Used to hide payment/subscription UI to comply with Apple App Store guidelines.
 * 
 * Note: The admin toggle (useIOSAppMode hook) provides an async override
 * that can disable this detection remotely.
 */
export function isIOSApp(): boolean {
  if (typeof window === 'undefined') return false;

  // Check environment variable first
  const reviewMode = import.meta.env.VITE_APPLE_REVIEW_MODE;
  if (reviewMode === 'true' || reviewMode === '1') return true;

  if (!navigator?.userAgent) return false;

  const ua = navigator.userAgent;

  // Check if it's an iOS device
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (!isIOS) return false;

  // Check if it's a WebView (not regular Safari)
  const isSafari = /Safari\//i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  const isWebView = !isSafari || /MohamieApp/i.test(ua);

  return isWebView;
}
