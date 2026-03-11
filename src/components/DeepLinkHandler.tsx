import { useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useDeepLinks } from '@/hooks/useDeepLinks';

/**
 * Component that handles deep links and URL parameters from Siri/Spotlight/Google Assistant
 * This component should be placed inside the Router context
 */
export const DeepLinkHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { handleDeepLink } = useDeepLinks();

  useEffect(() => {
    // Check for deep link query parameter (used when app is opened via URL)
    const deepLinkUrl = searchParams.get('deeplink');
    if (deepLinkUrl) {
      handleDeepLink(decodeURIComponent(deepLinkUrl));
    }

    // Check for Siri/Spotlight query parameter
    const siriQuery = searchParams.get('query');
    const source = searchParams.get('source');
    
    if (siriQuery && (source === 'siri' || source === 'spotlight')) {
      console.log(`Query from ${source}:`, siriQuery);
      // The query will be handled by the specific page component
    }
  }, [searchParams, handleDeepLink]);

  // Log route changes for debugging
  useEffect(() => {
    console.log('Route changed:', location.pathname, location.search);
  }, [location]);

  return <>{children}</>;
};

export default DeepLinkHandler;
