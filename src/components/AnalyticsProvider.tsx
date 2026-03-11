import { useGoogleAnalytics, usePageTracking } from "@/hooks/useAnalytics";

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize Google Analytics
  useGoogleAnalytics();
  
  // Track page views
  usePageTracking();

  return <>{children}</>;
};
