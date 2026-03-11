/**
 * Security Monitor Hook
 * مراقبة أمان التطبيق
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionManager, secureStorage } from '@/utils/secureStorage';
import { toast } from '@/hooks/use-toast';

interface SecurityEvent {
  type: 'session_timeout' | 'suspicious_activity' | 'auth_error' | 'rate_limit';
  timestamp: number;
  details?: string;
}

export const useSecurityMonitor = () => {
  const { user, signOut } = useAuth();
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const securityEventsRef = useRef<SecurityEvent[]>([]);

  /**
   * Log security event
   */
  const logSecurityEvent = useCallback((event: SecurityEvent) => {
    securityEventsRef.current.push(event);
    
    // Keep only last 100 events
    if (securityEventsRef.current.length > 100) {
      securityEventsRef.current = securityEventsRef.current.slice(-100);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Security Event]', event);
    }
  }, []);

  /**
   * Handle session timeout
   */
  const handleSessionTimeout = useCallback(async () => {
    logSecurityEvent({
      type: 'session_timeout',
      timestamp: Date.now(),
      details: 'Session expired due to inactivity'
    });

    toast({
      title: 'انتهت الجلسة',
      description: 'تم تسجيل خروجك تلقائياً بسبب عدم النشاط',
      variant: 'destructive'
    });

    await signOut();
  }, [signOut, logSecurityEvent]);

  /**
   * Reset activity timer - disabled auto-logout
   */
  const resetActivityTimer = useCallback(() => {
    // Auto-logout disabled - keep session persistent
    // Just update activity timestamp for tracking purposes
    sessionManager.updateActivity().catch(console.error);
  }, []);

  /**
   * Monitor user activity - disabled auto-logout
   * Session persistence is now enabled
   */
  useEffect(() => {
    // Auto-logout on inactivity is disabled
    // User session will persist until manual logout
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Monitor for suspicious activity
   */
  useEffect(() => {
    // Detect devtools opening (basic detection)
    const checkDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        logSecurityEvent({
          type: 'suspicious_activity',
          timestamp: Date.now(),
          details: 'DevTools may be open'
        });
      }
    };

    // Check periodically (not too frequently to avoid performance impact)
    const devToolsInterval = setInterval(checkDevTools, 10000);

    return () => clearInterval(devToolsInterval);
  }, [logSecurityEvent]);

  /**
   * Page visibility changes - no longer triggers logout
   * Session persistence is enabled
   */
  useEffect(() => {
    // Auto-logout on visibility change is disabled
    // User stays logged in even when switching tabs
  }, []);

  /**
   * Clear sensitive data on logout
   */
  const clearSensitiveData = useCallback(() => {
    secureStorage.clear();
    securityEventsRef.current = [];
    
    // Clear any cached data
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('user-data')) {
            caches.delete(name);
          }
        });
      });
    }
  }, []);

  return {
    logSecurityEvent,
    clearSensitiveData,
    resetActivityTimer,
    getSecurityEvents: () => [...securityEventsRef.current]
  };
};

export default useSecurityMonitor;
