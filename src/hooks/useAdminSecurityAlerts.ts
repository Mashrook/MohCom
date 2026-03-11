/**
 * Admin Security Alerts Hook - Real-time notifications for suspicious activities
 * إشعارات أمنية في الوقت الفعلي للمسؤولين
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface SecurityAlert {
  id: string;
  type: 'brute_force' | 'ip_blocked' | 'suspicious_activity' | 'leaked_password' | 'security_incident';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  isRead: boolean;
}

interface UseAdminSecurityAlertsOptions {
  enableToasts?: boolean;
  maxAlerts?: number;
}

export const useAdminSecurityAlerts = (options: UseAdminSecurityAlertsOptions = {}) => {
  const { enableToasts = true, maxAlerts = 50 } = options;
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addAlert = useCallback((alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'isRead'>) => {
    const newAlert: SecurityAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      isRead: false,
    };

    setAlerts(prev => {
      const updated = [newAlert, ...prev].slice(0, maxAlerts);
      return updated;
    });
    setUnreadCount(prev => prev + 1);

    if (enableToasts) {
      const variant = alert.severity === 'critical' || alert.severity === 'high' 
        ? 'destructive' 
        : 'default';
      
      toast({
        title: `🚨 ${alert.title}`,
        description: alert.description,
        variant,
        duration: alert.severity === 'critical' ? 10000 : 5000,
      });
    }
  }, [enableToasts, maxAlerts]);

  const markAsRead = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
    setUnreadCount(0);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  // Listen to real-time security events
  useEffect(() => {
    if (!isAdmin) return;

    // Listen to blocked_ips for new blocks
    const blockedIPsChannel = supabase
      .channel('admin-blocked-ips')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blocked_ips'
        },
        (payload) => {
          const data = payload.new as any;
          addAlert({
            type: 'ip_blocked',
            severity: data.is_permanent ? 'high' : 'medium',
            title: 'تم حظر عنوان IP',
            description: `تم حظر ${data.ip_address} - ${data.reason}`,
            metadata: { ip: data.ip_address, reason: data.reason, isPermanent: data.is_permanent }
          });
        }
      )
      .subscribe();

    // Listen to security_incidents
    const securityIncidentsChannel = supabase
      .channel('admin-security-incidents')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_incidents'
        },
        (payload) => {
          const data = payload.new as any;
          const severityMap: Record<string, SecurityAlert['severity']> = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'critical': 'critical'
          };
          addAlert({
            type: 'security_incident',
            severity: severityMap[data.severity] || 'medium',
            title: `حادث أمني: ${data.incident_type}`,
            description: data.description || `تم اكتشاف حادث أمني من النوع ${data.incident_type}`,
            metadata: { 
              incidentType: data.incident_type, 
              ip: data.ip_address,
              blocked: data.blocked 
            }
          });
        }
      )
      .subscribe();

    // Listen to security_audit_log for failed actions
    const auditLogChannel = supabase
      .channel('admin-audit-log')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_log'
        },
        (payload) => {
          const data = payload.new as any;
          // Only alert on failed security actions
          if (data.success === false) {
            addAlert({
              type: 'suspicious_activity',
              severity: 'medium',
              title: 'فشل إجراء أمني',
              description: `${data.action} على ${data.resource_type} - ${data.error_message || 'فشل غير محدد'}`,
              metadata: { 
                action: data.action, 
                resourceType: data.resource_type,
                ip: data.ip_address 
              }
            });
          }
        }
      )
      .subscribe();

    // Listen to password_security_logs for leaked password attempts
    const passwordLogsChannel = supabase
      .channel('admin-password-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'password_security_logs'
        },
        (payload) => {
          const data = payload.new as any;
          const isLeaked = data.rejection_reason?.includes('مسربة') || data.rejection_reason?.includes('HIBP');
          addAlert({
            type: 'leaked_password',
            severity: isLeaked ? 'high' : 'medium',
            title: isLeaked ? 'محاولة استخدام كلمة مرور مسربة' : 'كلمة مرور ضعيفة',
            description: `${data.email} - ${data.rejection_reason}`,
            metadata: { email: data.email, reason: data.rejection_reason }
          });
        }
      )
      .subscribe();

    // Listen to failed_login_attempts for brute force detection
    const failedLoginsChannel = supabase
      .channel('admin-failed-logins')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'failed_login_attempts'
        },
        async (payload) => {
          const data = payload.new as any;
          
          // Check if this is part of a brute force attack (5+ attempts in last 15 min)
          const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
          const { count } = await supabase
            .from('failed_login_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('email', data.email)
            .gte('attempt_time', fifteenMinAgo);

          if (count && count >= 5) {
            addAlert({
              type: 'brute_force',
              severity: count >= 10 ? 'critical' : 'high',
              title: 'هجوم تخمين كلمة المرور',
              description: `${count} محاولة فاشلة على ${data.email} في آخر 15 دقيقة`,
              metadata: { email: data.email, attemptCount: count, ip: data.ip_address }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(blockedIPsChannel);
      supabase.removeChannel(securityIncidentsChannel);
      supabase.removeChannel(auditLogChannel);
      supabase.removeChannel(passwordLogsChannel);
      supabase.removeChannel(failedLoginsChannel);
    };
  }, [isAdmin, addAlert]);

  return {
    alerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAlerts,
    addAlert,
  };
};
