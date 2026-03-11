/**
 * Suspicious Activity Detector Hook
 * نظام كشف الأنشطة المشبوهة التلقائي مع الحظر التلقائي
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SuspiciousPattern {
  id: string;
  type: 'brute_force' | 'account_takeover' | 'unusual_location' | 'rapid_requests' | 'password_spray' | 'session_hijack';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  sourceIp?: string;
  userId?: string;
  userEmail?: string;
  metadata: Record<string, any>;
  autoBlocked: boolean;
}

interface DetectionConfig {
  failedLoginThreshold: number;
  timeWindowMinutes: number;
  rapidRequestThreshold: number;
  enableAutoBlock: boolean;
  autoBlockThreshold: number;
  autoBlockDurationHours: number;
}

const DEFAULT_CONFIG: DetectionConfig = {
  failedLoginThreshold: 5,
  timeWindowMinutes: 15,
  rapidRequestThreshold: 100,
  enableAutoBlock: true,
  autoBlockThreshold: 10,
  autoBlockDurationHours: 24
};

export const useSuspiciousActivityDetector = (config: Partial<DetectionConfig> = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [patterns, setPatterns] = useState<SuspiciousPattern[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [blockedIPsCount, setBlockedIPsCount] = useState(0);
  const { toast } = useToast();
  const alertedPatternsRef = useRef<Set<string>>(new Set());
  const blockedIPsRef = useRef<Set<string>>(new Set());

  // وظيفة حظر IP تلقائياً
  const autoBlockIP = useCallback(async (ip: string, reason: string, attemptCount: number) => {
    if (!mergedConfig.enableAutoBlock || blockedIPsRef.current.has(ip)) return;

    try {
      const { error } = await supabase.rpc('auto_block_ip', {
        p_ip_address: ip,
        p_reason: reason,
        p_attempt_count: attemptCount,
        p_block_hours: mergedConfig.autoBlockDurationHours
      });

      if (error) throw error;

      blockedIPsRef.current.add(ip);
      setBlockedIPsCount(prev => prev + 1);

      toast({
        title: '🔒 تم حظر IP تلقائياً',
        description: `تم حظر ${ip} بسبب: ${reason}`,
        variant: 'destructive'
      });

      return true;
    } catch (error) {
      console.error('Error auto-blocking IP:', error);
      return false;
    }
  }, [mergedConfig.enableAutoBlock, mergedConfig.autoBlockDurationHours, toast]);

  // كشف محاولات Brute Force
  const detectBruteForce = useCallback(async (): Promise<SuspiciousPattern[]> => {
    const detected: SuspiciousPattern[] = [];
    const timeThreshold = new Date(Date.now() - mergedConfig.timeWindowMinutes * 60 * 1000).toISOString();

    try {
      const { data: failedAttempts, error } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .gte('attempt_time', timeThreshold)
        .order('attempt_time', { ascending: false });

      if (error) throw error;

      const ipAttempts: Record<string, { count: number; emails: Set<string>; lastAttempt: string }> = {};
      const emailAttempts: Record<string, { count: number; ips: Set<string>; lastAttempt: string }> = {};

      failedAttempts?.forEach(attempt => {
        if (attempt.ip_address) {
          if (!ipAttempts[attempt.ip_address]) {
            ipAttempts[attempt.ip_address] = { count: 0, emails: new Set(), lastAttempt: attempt.attempt_time };
          }
          ipAttempts[attempt.ip_address].count++;
          ipAttempts[attempt.ip_address].emails.add(attempt.email);
        }

        if (!emailAttempts[attempt.email]) {
          emailAttempts[attempt.email] = { count: 0, ips: new Set(), lastAttempt: attempt.attempt_time };
        }
        emailAttempts[attempt.email].count++;
        if (attempt.ip_address) {
          emailAttempts[attempt.email].ips.add(attempt.ip_address);
        }
      });

      // كشف Brute Force + حظر تلقائي
      for (const [ip, data] of Object.entries(ipAttempts)) {
        if (data.count >= mergedConfig.failedLoginThreshold) {
          const isPasswordSpray = data.emails.size > 3;
          const shouldAutoBlock = data.count >= mergedConfig.autoBlockThreshold;

          if (shouldAutoBlock && mergedConfig.enableAutoBlock) {
            await autoBlockIP(
              ip,
              isPasswordSpray ? 'هجوم Password Spray' : 'محاولات Brute Force متكررة',
              data.count
            );
          }

          detected.push({
            id: `bf-ip-${ip}-${Date.now()}`,
            type: isPasswordSpray ? 'password_spray' : 'brute_force',
            severity: isPasswordSpray ? 'critical' : 'high',
            title: isPasswordSpray ? '🚨 هجوم Password Spray' : '⚠️ محاولة Brute Force',
            description: isPasswordSpray 
              ? `${data.count} محاولة فاشلة من IP ${ip} على ${data.emails.size} حسابات مختلفة`
              : `${data.count} محاولة فاشلة من IP ${ip}`,
            timestamp: data.lastAttempt,
            sourceIp: ip,
            metadata: {
              attemptCount: data.count,
              targetedEmails: Array.from(data.emails),
              isPasswordSpray
            },
            autoBlocked: shouldAutoBlock && mergedConfig.enableAutoBlock
          });
        }
      }

      // كشف محاولات Account Takeover
      Object.entries(emailAttempts).forEach(([email, data]) => {
        if (data.count >= mergedConfig.failedLoginThreshold && data.ips.size > 1) {
          detected.push({
            id: `at-${email}-${Date.now()}`,
            type: 'account_takeover',
            severity: 'critical',
            title: '🔴 محاولة استيلاء على حساب',
            description: `${data.count} محاولة فاشلة للوصول إلى ${email} من ${data.ips.size} عناوين IP مختلفة`,
            timestamp: data.lastAttempt,
            userEmail: email,
            metadata: {
              attemptCount: data.count,
              sourceIps: Array.from(data.ips)
            },
            autoBlocked: data.count >= mergedConfig.autoBlockThreshold
          });
        }
      });

    } catch (error) {
      console.error('Error detecting brute force:', error);
    }

    return detected;
  }, [mergedConfig, autoBlockIP]);

  // كشف الأنماط المشبوهة في سجل الأمان
  const detectSecurityAnomalies = useCallback(async (): Promise<SuspiciousPattern[]> => {
    const detected: SuspiciousPattern[] = [];
    const timeThreshold = new Date(Date.now() - mergedConfig.timeWindowMinutes * 60 * 1000).toISOString();

    try {
      const { data: securityLogs, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .gte('created_at', timeThreshold)
        .eq('success', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userFailures: Record<string, { count: number; actions: string[]; lastAttempt: string; ips: Set<string> }> = {};

      securityLogs?.forEach(log => {
        if (log.user_id) {
          if (!userFailures[log.user_id]) {
            userFailures[log.user_id] = { count: 0, actions: [], lastAttempt: log.created_at || new Date().toISOString(), ips: new Set() };
          }
          userFailures[log.user_id].count++;
          if (!userFailures[log.user_id].actions.includes(log.action)) {
            userFailures[log.user_id].actions.push(log.action);
          }
          if (log.ip_address) {
            userFailures[log.user_id].ips.add(log.ip_address);
          }
        }
      });

      for (const [userId, data] of Object.entries(userFailures)) {
        if (data.count >= 5) {
          // حظر عناوين IP المشبوهة
          if (data.count >= mergedConfig.autoBlockThreshold && mergedConfig.enableAutoBlock) {
            for (const ip of data.ips) {
              await autoBlockIP(ip, `نشاط مشبوه متكرر (${data.count} عملية فاشلة)`, data.count);
            }
          }

          detected.push({
            id: `sec-${userId}-${Date.now()}`,
            type: 'rapid_requests',
            severity: data.count >= 10 ? 'critical' : 'high',
            title: '⚠️ نشاط مشبوه متكرر',
            description: `${data.count} عملية فاشلة: ${data.actions.join(', ')}`,
            timestamp: data.lastAttempt,
            userId,
            metadata: {
              failureCount: data.count,
              actions: data.actions,
              sourceIps: Array.from(data.ips)
            },
            autoBlocked: data.count >= mergedConfig.autoBlockThreshold && mergedConfig.enableAutoBlock
          });
        }
      }

    } catch (error) {
      console.error('Error detecting security anomalies:', error);
    }

    return detected;
  }, [mergedConfig, autoBlockIP]);

  // كشف كلمات المرور المسربة
  const detectLeakedPasswords = useCallback(async (): Promise<SuspiciousPattern[]> => {
    const detected: SuspiciousPattern[] = [];
    const timeThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    try {
      const { data: passwordLogs, error } = await supabase
        .from('password_security_logs')
        .select('*')
        .gte('created_at', timeThreshold)
        .ilike('rejection_reason', '%مسربة%')
        .order('created_at', { ascending: false });

      if (error) throw error;

      for (const log of passwordLogs || []) {
        // حظر IP عند استخدام كلمات مرور مسربة متكررة
        if (log.ip_address && mergedConfig.enableAutoBlock) {
          const sameIPLogs = passwordLogs?.filter(l => l.ip_address === log.ip_address) || [];
          if (sameIPLogs.length >= 3) {
            await autoBlockIP(log.ip_address, 'محاولات متكررة باستخدام كلمات مرور مسربة', sameIPLogs.length);
          }
        }

        detected.push({
          id: `pwd-${log.id}`,
          type: 'account_takeover',
          severity: 'critical',
          title: '🔴 محاولة استخدام كلمة مرور مسربة!',
          description: `البريد: ${log.email} - السبب: ${log.rejection_reason}`,
          timestamp: log.created_at,
          userEmail: log.email,
          sourceIp: log.ip_address || undefined,
          metadata: {
            email: log.email,
            reason: log.rejection_reason,
            userAgent: log.user_agent
          },
          autoBlocked: false
        });
      }

    } catch (error) {
      console.error('Error detecting leaked passwords:', error);
    }

    return detected;
  }, [mergedConfig.enableAutoBlock, autoBlockIP]);

  // تشغيل الفحص الشامل
  const runDetection = useCallback(async () => {
    setIsDetecting(true);
    
    try {
      const [bruteForce, anomalies, leakedPwd] = await Promise.all([
        detectBruteForce(),
        detectSecurityAnomalies(),
        detectLeakedPasswords()
      ]);

      const allPatterns = [...bruteForce, ...anomalies, ...leakedPwd]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      allPatterns.forEach(pattern => {
        if (!alertedPatternsRef.current.has(pattern.id) && 
            (pattern.severity === 'critical' || pattern.severity === 'high')) {
          toast({
            title: pattern.title,
            description: pattern.description,
            variant: "destructive"
          });
          alertedPatternsRef.current.add(pattern.id);
        }
      });

      setPatterns(allPatterns);
      setLastScan(new Date());

    } catch (error) {
      console.error('Error running detection:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [detectBruteForce, detectSecurityAnomalies, detectLeakedPasswords, toast]);

  useEffect(() => {
    runDetection();
    const interval = setInterval(runDetection, 30000);
    return () => clearInterval(interval);
  }, [runDetection]);

  useEffect(() => {
    const failedLoginChannel = supabase
      .channel('failed-login-detector')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'failed_login_attempts' }, () => runDetection())
      .subscribe();

    const securityLogChannel = supabase
      .channel('security-log-detector')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_audit_log' }, (payload) => {
        if (!(payload.new as any).success) runDetection();
      })
      .subscribe();

    const passwordLogChannel = supabase
      .channel('password-log-detector')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'password_security_logs' }, () => runDetection())
      .subscribe();

    return () => {
      supabase.removeChannel(failedLoginChannel);
      supabase.removeChannel(securityLogChannel);
      supabase.removeChannel(passwordLogChannel);
    };
  }, [runDetection]);

  const getCriticalCount = () => patterns.filter(p => p.severity === 'critical').length;
  const getHighCount = () => patterns.filter(p => p.severity === 'high').length;
  const getAutoBlockedCount = () => patterns.filter(p => p.autoBlocked).length;

  return {
    patterns,
    isDetecting,
    lastScan,
    runDetection,
    getCriticalCount,
    getHighCount,
    getAutoBlockedCount,
    blockedIPsCount,
    config: mergedConfig
  };
};

export default useSuspiciousActivityDetector;
