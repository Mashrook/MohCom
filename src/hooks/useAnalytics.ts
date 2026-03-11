import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { GA_MEASUREMENT_ID, isGAConfigured } from "@/lib/analytics-config";

// Declare gtag on window
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Initialize Google Analytics
export const initGA = () => {
  if (!isGAConfigured()) {
    console.warn("Google Analytics: Measurement ID not configured");
    return;
  }

  // Add gtag script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    cookie_flags: "SameSite=None;Secure",
  });
};

// Track page views
export const trackPageView = (path: string, title?: string) => {
  if (!isGAConfigured() || typeof window.gtag !== "function") return;
  
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title,
  });
};

// Track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (!isGAConfigured() || typeof window.gtag !== "function") return;
  
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track user interactions
export const trackUserAction = {
  // Authentication events
  login: (method: string) => trackEvent("login", "authentication", method),
  signUp: (method: string) => trackEvent("sign_up", "authentication", method),
  logout: () => trackEvent("logout", "authentication"),
  
  // Subscription events
  viewPricing: () => trackEvent("view_item_list", "subscription", "pricing_page"),
  startCheckout: (plan: string) => trackEvent("begin_checkout", "subscription", plan),
  completeSubscription: (plan: string, value: number) => 
    trackEvent("purchase", "subscription", plan, value),
  
  // Service usage events
  startConsultation: () => trackEvent("start", "consultation"),
  sendMessage: () => trackEvent("send_message", "consultation"),
  uploadFile: (fileType: string) => trackEvent("upload", "files", fileType),
  downloadContract: (templateName: string) => 
    trackEvent("download", "contracts", templateName),
  
  // Search events
  search: (query: string) => trackEvent("search", "legal_search", query),
  
  // Navigation events
  clickCTA: (ctaName: string) => trackEvent("click", "cta", ctaName),
  viewService: (serviceName: string) => trackEvent("view", "services", serviceName),
};

// Hook to track page views automatically
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title);
  }, [location]);
};

// Hook to initialize GA on app load
export const useGoogleAnalytics = () => {
  useEffect(() => {
    initGA();
  }, []);
};
