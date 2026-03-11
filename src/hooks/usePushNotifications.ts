import { useEffect, useState, useCallback } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  token: string | null;
  error: string | null;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    token: null,
    error: null,
  });

  const isNativePlatform = Capacitor.isNativePlatform();

  const requestPermission = useCallback(async () => {
    if (!isNativePlatform) {
      setState(prev => ({ ...prev, error: 'Push notifications are only available on native platforms' }));
      return false;
    }

    try {
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          setState(prev => ({ ...prev, error: 'Push notification permission denied' }));
          toast.error('تم رفض إذن الإشعارات');
          return false;
        }
      } else if (permStatus.receive !== 'granted') {
        setState(prev => ({ ...prev, error: 'Push notification permission not granted' }));
        toast.error('لم يتم منح إذن الإشعارات');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      setState(prev => ({ ...prev, error: 'Failed to request permission' }));
      return false;
    }
  }, [isNativePlatform]);

  const register = useCallback(async () => {
    if (!isNativePlatform) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      await PushNotifications.register();
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      setState(prev => ({ ...prev, error: 'Failed to register for push notifications' }));
    }
  }, [isNativePlatform, requestPermission]);

  const unregister = useCallback(async () => {
    if (!isNativePlatform) return;

    try {
      await PushNotifications.removeAllListeners();
      setState(prev => ({ ...prev, isRegistered: false, token: null }));
      toast.success('تم إلغاء تسجيل الإشعارات');
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  }, [isNativePlatform]);

  useEffect(() => {
    if (!isNativePlatform) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    // Registration success handler
    const registrationListener = PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setState(prev => ({ ...prev, isRegistered: true, token: token.value, error: null }));
      toast.success('تم تفعيل الإشعارات بنجاح');
    });

    // Registration error handler
    const registrationErrorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
      setState(prev => ({ ...prev, error: error.error, isRegistered: false }));
      toast.error('فشل في تسجيل الإشعارات');
    });

    // Notification received while app is in foreground
    const notificationReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        toast.info(notification.title || 'إشعار جديد', {
          description: notification.body,
        });
      }
    );

    // Notification action performed (user tapped on notification)
    const notificationActionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        const data = action.notification.data;
        
        // Handle deep linking based on notification data
        if (data?.route) {
          window.location.href = data.route;
        }
      }
    );

    // Cleanup listeners on unmount
    return () => {
      registrationListener.then(listener => listener.remove());
      registrationErrorListener.then(listener => listener.remove());
      notificationReceivedListener.then(listener => listener.remove());
      notificationActionListener.then(listener => listener.remove());
    };
  }, [isNativePlatform]);

  return {
    ...state,
    register,
    unregister,
    requestPermission,
  };
};
