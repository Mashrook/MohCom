import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SecurityAlert {
  id: string;
  type: 'role_change' | 'suspicious_activity' | 'failed_auth' | 'data_access' | 'policy_violation' | 'payment_error' | 'leaked_password';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
}

export interface SuspiciousActivity {
  id: string;
  userId: string;
  activityType: string;
  attemptCount: number;
  lastAttempt: string;
  ipAddress?: string;
  blocked: boolean;
}

export interface PaymentErrorAlert {
  userId: string;
  errorCount: number;
  lastErrorAt: string;
  userName?: string;
  userEmail?: string;
  recentErrors: string[];
  isBlocked: boolean;
}

export const useSecurityAlerts = (paymentErrorThreshold: number = 3) => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [paymentErrorAlerts, setPaymentErrorAlerts] = useState<PaymentErrorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch security alerts from audit logs
  const fetchSecurityAlerts = useCallback(async () => {
    try {
      // Fetch from admin_audit_log for role changes
      const { data: adminLogs, error: adminError } = await supabase
        .from('admin_audit_log')
        .select('*')
        .in('action_type', ['role_assigned', 'role_changed', 'role_removed', 'subscription_modified'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (adminError) throw adminError;

      // Fetch from security_audit_log for suspicious activities
      const { data: securityLogs, error: securityError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (securityError) throw securityError;

      // Fetch from password_security_logs for leaked password attempts
      const { data: passwordLogs, error: passwordError } = await supabase
        .from('password_security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (passwordError) throw passwordError;

      // Transform admin logs to alerts
      const adminAlerts: SecurityAlert[] = (adminLogs || []).map(log => ({
        id: log.id,
        type: 'role_change' as const,
        severity: getSeverityForAction(log.action_type),
        title: getAlertTitle(log.action_type),
        description: log.action_description || getAlertDescription(log.action_type, log.old_values, log.new_values),
        timestamp: log.created_at,
        userId: log.target_user_id || undefined,
        metadata: {
          adminId: log.admin_id,
          targetTable: log.target_table,
          oldValues: log.old_values,
          newValues: log.new_values
        },
        acknowledged: false
      }));

      // Transform security logs to alerts
      const securityAlerts: SecurityAlert[] = (securityLogs || []).map(log => ({
        id: log.id,
        type: log.success ? 'data_access' : 'suspicious_activity' as const,
        severity: log.success ? 'low' : 'high' as const,
        title: log.success ? 'وصول للبيانات' : 'محاولة فاشلة',
        description: `${log.action} - ${log.resource_type}${log.error_message ? `: ${log.error_message}` : ''}`,
        timestamp: log.created_at || new Date().toISOString(),
        userId: log.user_id || undefined,
        metadata: {
          resourceType: log.resource_type,
          resourceId: log.resource_id,
          ipAddress: log.ip_address,
          success: log.success
        },
        acknowledged: false
      }));

      // Transform password security logs to alerts
      const passwordAlerts: SecurityAlert[] = (passwordLogs || []).map(log => ({
        id: log.id,
        type: 'leaked_password' as const,
        severity: log.rejection_reason?.includes('مسربة') ? 'critical' : 'high' as const,
        title: '🔐 محاولة استخدام كلمة مرور غير آمنة',
        description: `${log.email}: ${log.rejection_reason}`,
        timestamp: log.created_at,
        userEmail: log.email,
        metadata: {
          email: log.email,
          rejectionReason: log.rejection_reason,
          userAgent: log.user_agent,
          ipAddress: log.ip_address
        },
        acknowledged: false
      }));

      // Combine and sort
      const allAlerts = [...adminAlerts, ...securityAlerts, ...passwordAlerts]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setAlerts(allAlerts);

      // Analyze for suspicious patterns
      analyzeSuspiciousPatterns(securityLogs || []);

      // Fetch payment error alerts
      await fetchPaymentErrorAlerts();

    } catch (error) {
      console.error('Error fetching security alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch payment errors grouped by user
  const fetchPaymentErrorAlerts = useCallback(async () => {
    try {
      const { data: errors, error } = await supabase
        .from('payment_errors')
        .select('user_id, error_message, created_at')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch blocked users
      const { data: blockedUsers } = await supabase
        .from('blocked_payment_users')
        .select('user_id')
        .is('unblocked_at', null);

      const blockedUserIds = new Set(blockedUsers?.map(b => b.user_id) || []);

      // Group errors by user_id
      const userErrorMap = new Map<string, {
        count: number;
        lastError: string;
        errors: string[];
      }>();

      errors?.forEach((err) => {
        if (!err.user_id) return;
        
        const existing = userErrorMap.get(err.user_id);
        if (existing) {
          existing.count++;
          if (existing.errors.length < 5) {
            existing.errors.push(err.error_message);
          }
        } else {
          userErrorMap.set(err.user_id, {
            count: 1,
            lastError: err.created_at,
            errors: [err.error_message]
          });
        }
      });

      // Filter users with errors >= threshold and fetch user info
      const alertUsers: PaymentErrorAlert[] = [];
      
      for (const [userId, data] of userErrorMap) {
        if (data.count >= paymentErrorThreshold) {
          let email: string | undefined;
          let fullName: string | undefined;
          
          try {
            const emailResult = await supabase.rpc('get_user_email_for_admin', {
              target_user_id: userId
            });
            if (emailResult.data) {
              email = emailResult.data;
            }
          } catch {
            // Ignore email fetch errors
          }

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', userId)
              .maybeSingle();
            if (profile?.full_name) {
              fullName = profile.full_name;
            }
          } catch {
            // Ignore profile fetch errors
          }

          alertUsers.push({
            userId,
            errorCount: data.count,
            lastErrorAt: data.lastError,
            userName: fullName,
            userEmail: email,
            recentErrors: data.errors,
            isBlocked: blockedUserIds.has(userId)
          });
        }
      }

      // Sort by error count descending
      setPaymentErrorAlerts(alertUsers.sort((a, b) => b.errorCount - a.errorCount));

    } catch (error) {
      console.error('Error fetching payment error alerts:', error);
    }
  }, [paymentErrorThreshold]);

  // Analyze logs for suspicious patterns
  const analyzeSuspiciousPatterns = (logs: any[]) => {
    const failedAttempts: Record<string, { count: number; lastAttempt: string; actions: string[] }> = {};

    logs.forEach(log => {
      if (!log.success && log.user_id) {
        if (!failedAttempts[log.user_id]) {
          failedAttempts[log.user_id] = { count: 0, lastAttempt: log.created_at, actions: [] };
        }
        failedAttempts[log.user_id].count++;
        failedAttempts[log.user_id].actions.push(log.action);
        if (new Date(log.created_at) > new Date(failedAttempts[log.user_id].lastAttempt)) {
          failedAttempts[log.user_id].lastAttempt = log.created_at;
        }
      }
    });

    const suspicious: SuspiciousActivity[] = Object.entries(failedAttempts)
      .filter(([_, data]) => data.count >= 3) // 3+ failed attempts is suspicious
      .map(([userId, data]) => ({
        id: userId,
        userId,
        activityType: data.actions.join(', '),
        attemptCount: data.count,
        lastAttempt: data.lastAttempt,
        blocked: data.count >= 10 // Auto-flag for blocking at 10+ attempts
      }));

    setSuspiciousActivities(suspicious);
  };

  // Subscribe to real-time changes
  useEffect(() => {
    fetchSecurityAlerts();

    // Subscribe to admin_audit_log changes
    const adminChannel = supabase
      .channel('admin-audit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_audit_log'
        },
        (payload) => {
          const log = payload.new as any;
          const newAlert: SecurityAlert = {
            id: log.id,
            type: 'role_change',
            severity: getSeverityForAction(log.action_type),
            title: getAlertTitle(log.action_type),
            description: log.action_description || '',
            timestamp: log.created_at,
            userId: log.target_user_id,
            metadata: log,
            acknowledged: false
          };
          
          setAlerts(prev => [newAlert, ...prev]);
          
          // Show toast for critical alerts
          if (newAlert.severity === 'critical' || newAlert.severity === 'high') {
            toast({
              title: "⚠️ تنبيه أمني",
              description: newAlert.title,
              variant: "destructive"
            });
          }
        }
      )
      .subscribe();

    // Subscribe to security_audit_log changes
    const securityChannel = supabase
      .channel('security-audit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_log'
        },
        (payload) => {
          const log = payload.new as any;
          if (!log.success) {
            const newAlert: SecurityAlert = {
              id: log.id,
              type: 'suspicious_activity',
              severity: 'high',
              title: 'محاولة وصول فاشلة',
              description: `${log.action} - ${log.resource_type}`,
              timestamp: log.created_at,
              userId: log.user_id,
              metadata: log,
              acknowledged: false
            };
            
            setAlerts(prev => [newAlert, ...prev]);
            
            toast({
              title: "🚨 نشاط مشبوه",
              description: newAlert.description,
              variant: "destructive"
            });
          }
        }
      )
      .subscribe();

    // Subscribe to password_security_logs changes for leaked password attempts
    const passwordChannel = supabase
      .channel('password-security-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'password_security_logs'
        },
        (payload) => {
          const log = payload.new as any;
          const isLeaked = log.rejection_reason?.includes('مسربة');
          const newAlert: SecurityAlert = {
            id: log.id,
            type: 'leaked_password',
            severity: isLeaked ? 'critical' : 'high',
            title: isLeaked ? '🚨 محاولة استخدام كلمة مرور مسربة!' : '⚠️ كلمة مرور ضعيفة',
            description: `${log.email}: ${log.rejection_reason}`,
            timestamp: log.created_at,
            userEmail: log.email,
            metadata: {
              email: log.email,
              rejectionReason: log.rejection_reason,
              userAgent: log.user_agent,
              ipAddress: log.ip_address
            },
            acknowledged: false
          };
          
          setAlerts(prev => [newAlert, ...prev]);
          
          // Show toast notification for admins
          toast({
            title: isLeaked ? "🚨 تنبيه: كلمة مرور مسربة!" : "⚠️ كلمة مرور ضعيفة",
            description: `${log.email}\n${log.rejection_reason}`,
            variant: "destructive"
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
      supabase.removeChannel(securityChannel);
      supabase.removeChannel(passwordChannel);
    };
  }, [fetchSecurityAlerts, toast]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const getUnacknowledgedCount = () => {
    return alerts.filter(a => !a.acknowledged && (a.severity === 'high' || a.severity === 'critical')).length;
  };

  return {
    alerts,
    suspiciousActivities,
    paymentErrorAlerts,
    loading,
    acknowledgeAlert,
    getUnacknowledgedCount,
    refetch: fetchSecurityAlerts
  };
};

// Helper functions
function getSeverityForAction(actionType: string): SecurityAlert['severity'] {
  switch (actionType) {
    case 'role_assigned':
    case 'role_changed':
    case 'role_removed':
      return 'critical';
    case 'subscription_modified':
      return 'high';
    case 'data_access':
      return 'medium';
    default:
      return 'low';
  }
}

function getAlertTitle(actionType: string): string {
  switch (actionType) {
    case 'role_assigned':
      return 'تعيين دور جديد';
    case 'role_changed':
      return 'تغيير دور مستخدم';
    case 'role_removed':
      return 'إزالة دور مستخدم';
    case 'subscription_modified':
      return 'تعديل اشتراك';
    default:
      return 'عملية إدارية';
  }
}

function getAlertDescription(actionType: string, oldValues: any, newValues: any): string {
  if (actionType === 'role_changed' && oldValues && newValues) {
    return `تم تغيير الدور من ${oldValues.role} إلى ${newValues.role}`;
  }
  if (actionType === 'role_assigned' && newValues) {
    return `تم تعيين دور ${newValues.role}`;
  }
  if (actionType === 'role_removed' && oldValues) {
    return `تم إزالة دور ${oldValues.role}`;
  }
  return 'تم تنفيذ عملية إدارية';
}
