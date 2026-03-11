/**
 * Utility functions for handling deep links in the Mohamie app
 */

export interface DeepLinkRoute {
  path: string;
  title: string;
  titleAr: string;
  icon: string;
}

// Map of supported deep link routes
export const DEEP_LINK_ROUTES: Record<string, DeepLinkRoute> = {
  consultation: {
    path: '/consultation',
    title: 'Legal Consultation',
    titleAr: 'استشارة قانونية',
    icon: 'MessageSquare',
  },
  search: {
    path: '/legal-search',
    title: 'Legal Search',
    titleAr: 'البحث القانوني',
    icon: 'Search',
  },
  contracts: {
    path: '/contracts',
    title: 'Contracts',
    titleAr: 'العقود',
    icon: 'FileText',
  },
  predictions: {
    path: '/predictions',
    title: 'Case Predictions',
    titleAr: 'توقعات القضايا',
    icon: 'TrendingUp',
  },
  lawyers: {
    path: '/lawyers',
    title: 'Find Lawyers',
    titleAr: 'البحث عن محامي',
    icon: 'Users',
  },
  messages: {
    path: '/messages',
    title: 'Messages',
    titleAr: 'الرسائل',
    icon: 'Mail',
  },
  settings: {
    path: '/account-settings',
    title: 'Settings',
    titleAr: 'الإعدادات',
    icon: 'Settings',
  },
  dashboard: {
    path: '/dashboard',
    title: 'Dashboard',
    titleAr: 'لوحة التحكم',
    icon: 'LayoutDashboard',
  },
  paywall: {
    path: '/paywall',
    title: 'Subscribe',
    titleAr: 'الاشتراك',
    icon: 'CreditCard',
  },
};

/**
 * Build a deep link URL for the app
 */
export const buildDeepLink = (
  route: keyof typeof DEEP_LINK_ROUTES,
  params?: Record<string, string>
): string => {
  const baseUrl = `mohamie://${route}`;
  
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = new URLSearchParams(params).toString();
  return `${baseUrl}?${queryString}`;
};

/**
 * Build a universal link URL for the app
 */
export const buildUniversalLink = (
  route: keyof typeof DEEP_LINK_ROUTES,
  params?: Record<string, string>
): string => {
  const routeConfig = DEEP_LINK_ROUTES[route];
  if (!routeConfig) {
    return '';
  }
  
  const baseUrl = `https://mohamie.app${routeConfig.path}`;
  
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = new URLSearchParams(params).toString();
  return `${baseUrl}?${queryString}`;
};

/**
 * Extract query parameters from a deep link URL
 */
export const extractDeepLinkParams = (url: string): Record<string, string> => {
  try {
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) {
      return {};
    }
    
    const queryString = url.substring(queryIndex + 1);
    const params: Record<string, string> = {};
    
    new URLSearchParams(queryString).forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  } catch {
    return {};
  }
};

/**
 * Check if the app was opened via a deep link
 */
export const wasOpenedViaDeepLink = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('deeplink') || urlParams.has('source');
};

/**
 * Get the source of the deep link (siri, spotlight, assistant, etc.)
 */
export const getDeepLinkSource = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('source');
};
