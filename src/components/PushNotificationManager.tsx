import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

export const PushNotificationManager = () => {
  const { isSupported, register } = usePushNotifications();
  const { user } = useAuth();

  useEffect(() => {
    // Auto-register for push notifications when user is logged in
    if (isSupported && user) {
      register();
    }
  }, [isSupported, user, register]);

  // This component doesn't render anything
  return null;
};
