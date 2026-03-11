import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface DeepLinkData {
  path: string;
  query?: string;
}

declare global {
  interface Window {
    Capacitor?: {
      Plugins?: {
        App?: {
          addListener: (event: string, callback: (data: { url: string }) => void) => { remove: () => void };
          getLaunchUrl?: () => Promise<{ url: string } | null>;
        };
        MohamieDeepLink?: {
          addListener: (event: string, callback: (data: { path: string }) => void) => { remove: () => void };
        };
      };
    };
  }
}

// Route map: deep-link host → hash route path
const ROUTE_MAP: Record<string, string> = {
  consultation: '/consultation',
  search: '/legal-search',
  contracts: '/contracts',
  predictions: '/predictions',
  lawyers: '/lawyers',
  messages: '/messages',
  settings: '/account-settings',
  dashboard: '/dashboard',
  auth: '/auth',
  paywall: '/paywall',
  subscription: '/subscription',
};

// Universal-link path → hash route (handles /shared-contract/* too)
function universalPathToRoute(pathname: string): string {
  // Exact matches first
  const clean = pathname.replace(/^\/+/, '/');
  for (const [, route] of Object.entries(ROUTE_MAP)) {
    if (clean === route) return route;
  }
  // Wildcard paths
  if (clean.startsWith('/shared-contract/')) return clean;
  if (clean.startsWith('/blog/')) return clean;
  if (clean.startsWith('/lawyer-dashboard')) return clean;
  if (clean.startsWith('/admin')) return clean;
  // Fallback: use the path as-is (HashRouter will show NotFound if invalid)
  return clean;
}

export const useDeepLinks = () => {
  const navigate = useNavigate();
  const handledLaunchUrl = useRef(false);

  const parseDeepLink = useCallback((url: string): DeepLinkData | null => {
    try {
      // Handle mohamie:// scheme
      if (url.startsWith('mohamie://')) {
        const urlWithoutScheme = url.replace('mohamie://', '');
        const [host, ...pathParts] = urlWithoutScheme.split('/');
        const fullSubPath = pathParts.join('/');
        const queryIndex = fullSubPath.indexOf('?');

        let subPath = '';
        let query = '';

        if (queryIndex > -1) {
          subPath = fullSubPath.substring(0, queryIndex);
          query = fullSubPath.substring(queryIndex + 1);
        } else {
          subPath = fullSubPath;
        }

        const basePath = ROUTE_MAP[host] || `/${host}`;
        const fullRoutePath = subPath ? `${basePath}/${subPath}` : basePath;

        return { path: fullRoutePath, query };
      }

      // Handle https:// universal links (AASA)
      if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        const routePath = universalPathToRoute(urlObj.pathname);
        return { path: routePath, query: urlObj.search.replace('?', '') };
      }

      return null;
    } catch (error) {
      console.error('[DeepLink] Error parsing:', error);
      return null;
    }
  }, []);

  const handleDeepLink = useCallback((url: string) => {
    const linkData = parseDeepLink(url);

    if (linkData) {
      console.log('[DeepLink] Navigating to:', linkData);

      const fullPath = linkData.query
        ? `${linkData.path}?${linkData.query}`
        : linkData.path;

      navigate(fullPath);

      if (linkData.path.includes('consultation') && linkData.query) {
        toast.info('جاري فتح الاستشارة القانونية...');
      } else if (linkData.path.includes('legal-search') && linkData.query) {
        toast.info('جاري البحث القانوني...');
      }
    }
  }, [navigate, parseDeepLink]);

  const handleNativeNavigation = useCallback((path: string) => {
    console.log('[DeepLink] Native navigation to:', path);
    navigate(path);
  }, [navigate]);

  useEffect(() => {
    // ── Cold-start: check if the app was launched via a URL ──
    if (!handledLaunchUrl.current && window.Capacitor?.Plugins?.App?.getLaunchUrl) {
      handledLaunchUrl.current = true;
      window.Capacitor.Plugins.App.getLaunchUrl().then((result) => {
        if (result?.url) {
          console.log('[DeepLink] Cold-start launch URL:', result.url);
          handleDeepLink(result.url);
        }
      }).catch(() => { /* ignore */ });
    }

    // ── Runtime listeners ──
    if (!window.Capacitor?.Plugins) return;

    const { App, MohamieDeepLink } = window.Capacitor.Plugins;

    let appUrlListener: { remove: () => void } | null = null;
    if (App?.addListener) {
      appUrlListener = App.addListener('appUrlOpen', (data: { url: string }) => {
        console.log('[DeepLink] appUrlOpen:', data.url);
        handleDeepLink(data.url);
      });
    }

    let deepLinkListener: { remove: () => void } | null = null;
    if (MohamieDeepLink?.addListener) {
      deepLinkListener = MohamieDeepLink.addListener('deepLink', (data: { path: string }) => {
        console.log('[DeepLink] custom event:', data.path);
        handleNativeNavigation(data.path);
      });
    }

    // Fallback: web custom event
    const handleWindowDeepLink = (event: CustomEvent<{ path: string }>) => {
      handleNativeNavigation(event.detail.path);
    };
    window.addEventListener('mohamie-deep-link', handleWindowDeepLink as EventListener);

    return () => {
      appUrlListener?.remove();
      deepLinkListener?.remove();
      window.removeEventListener('mohamie-deep-link', handleWindowDeepLink as EventListener);
    };
  }, [handleDeepLink, handleNativeNavigation]);

  return { handleDeepLink, parseDeepLink };
};
